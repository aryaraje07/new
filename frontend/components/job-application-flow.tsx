'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Download, Eye, FileText, RefreshCw, Sparkles, Upload } from 'lucide-react'

type ResumeVersion = {versionNumber:number;label:string;createdAt:string;sections?:Record<string,string>}
type ResumeRecord = {
  id:string
  originalFile:{originalName:string;format:'pdf'|'docx';size:number}
  activeVersionNumber:number
  versions:ResumeVersion[]
  activeVersion?:ResumeVersion
}
type Requirement = {requirement:string;status:'matched'|'partial'|'not_documented';evidence:string}
type Suggestion = {suggestionId:string;section:string;originalText:string;proposedText:string;reason:string;status:string}
type Analysis = {
  id:string;score:number;scoreMeaning:string;explanation:string;versionNumber:number
  factors:Array<{name:string;score:number;weight:number;explanation:string}>
  matchedRequirements:Requirement[];missingRequirements:Requirement[];suggestions:Suggestion[]
}
type ApplicationRecord = {
  id:string;jobId:string;resumeId:string|null;resumeVersionNumber:number|null
  analysisId:string|null;matchScore:number|null;workflowState:string;status:string
  tailoredResume:{versionNumber:number;sourceAnalysisId:string;generatedAt:string;sections:Record<string,string>}|null
}
type Job = {id:string;title:string;description:string;employer:{name:string}}
type ApiResult<T> = T & {error?:string}

const API_BASE=process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/,'')||''

async function apiRequest<T>(path:string,options:RequestInit={}):Promise<T> {
  if(!API_BASE)throw new Error('The API is not configured. Set NEXT_PUBLIC_API_URL and restart the frontend.')
  let response:Response
  try {
    response=await fetch(`${API_BASE}${path}`,{
      ...options,
      credentials:'include',
      headers:options.body instanceof FormData?options.headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},
    })
  } catch {
    throw new Error('Unable to reach the API. Check that the backend is running and try again.')
  }
  let result:ApiResult<T>
  try { result=await response.json() } catch { throw new Error('The API returned an invalid response.') }
  if(!response.ok)throw new Error(result.error||'The request could not be completed.')
  return result
}

export function JobApplicationFlow({jobId}:{jobId:string}) {
  const router=useRouter()
  const [job,setJob]=useState<Job|null>(null)
  const [resumes,setResumes]=useState<ResumeRecord[]>([])
  const [selectedResume,setSelectedResume]=useState('')
  const [application,setApplication]=useState<ApplicationRecord|null>(null)
  const [analysis,setAnalysis]=useState<Analysis|null>(null)
  const [showTailoredPreview,setShowTailoredPreview]=useState(false)
  const [file,setFile]=useState<File|null>(null)
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [hasDraft,setHasDraft]=useState(false)

  const activeResume=resumes.find(item=>item.id===selectedResume)
  const steps=['Choose resume','Review match','Preview & apply']

  useEffect(()=>{
    let active=true
    async function initialize() {
      try {
        const [jobResult,resumeResult]=await Promise.all([
          apiRequest<{job:Job}>(`/jobs/${encodeURIComponent(jobId)}`),
          apiRequest<{resumes:ResumeRecord[]}>('/resumes'),
        ])
        if(!active)return
        setJob(jobResult.job)
        setResumes(resumeResult.resumes)
        setSelectedResume(resumeResult.resumes[0]?.id||'')

        const applicationResult=await apiRequest<{application:ApplicationRecord;alreadySubmitted?:boolean}>('/applications',{method:'POST',body:JSON.stringify({jobId})})
        if(!active)return
        setApplication(applicationResult.application)
        setShowTailoredPreview(Boolean(applicationResult.application.tailoredResume))
        setSelectedResume(applicationResult.application.resumeId||resumeResult.resumes[0]?.id||'')
        setHasDraft(applicationResult.application.status==='draft')
        if(applicationResult.alreadySubmitted)router.replace('/candidate/applications')
        if(applicationResult.application.analysisId) {
          const analysisResult=await apiRequest<{analysis:Analysis}>(`/resumes/analyses/${applicationResult.application.analysisId}`)
          if(active)setAnalysis(analysisResult.analysis)
        }
      } catch(reason) {
        if(active)setError(reason instanceof Error?reason.message:'Unable to start this application.')
      } finally {
        if(active)setLoading(false)
      }
    }
    initialize()
    return ()=>{active=false}
  },[jobId,router])

  async function selectSavedResume(resumeId:string) {
    setSelectedResume(resumeId)
    setAnalysis(null)
    setShowTailoredPreview(false)
    if(!application||!resumeId)return
    setBusy(true);setError('');setNotice('')
    try {
      const result=await apiRequest<{application:ApplicationRecord}>(`/applications/${application.id}/resume`,{
        method:'PUT',body:JSON.stringify({resumeId}),
      })
      setApplication(result.application)
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Unable to select that resume.')
    } finally {setBusy(false)}
  }

  async function restartApplication() {
    if(!application||!jobId)return
    setBusy(true);setError('')
    try {
      const result=await apiRequest<{application:ApplicationRecord}>('/applications',{
        method:'POST',body:JSON.stringify({jobId,restart:true}),
      })
      setApplication(result.application)
      setAnalysis(null)
      setShowTailoredPreview(false)
      setNotice('Application restarted. You can now select a new resume and reanalyze.')
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Unable to restart the application.')
    } finally {setBusy(false)}
  }

  async function uploadResume(event:ChangeEvent<HTMLInputElement>) {
    const uploaded=event.target.files?.[0]
    if(!uploaded)return
    setFile(uploaded)
    if(!application){setError('The application session is not ready yet.');return}
    setBusy(true);setError('');setNotice('')
    try {
      const form=new FormData()
      form.append('resume',uploaded)
      const result=await apiRequest<{resume:ResumeRecord}>('/resumes',{method:'POST',body:form})
      setResumes(current=>[result.resume,...current.filter(item=>item.id!==result.resume.id)])
      setFile(null)
      await selectSavedResume(result.resume.id)
      setNotice('Resume uploaded and selected for this application.')
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Resume upload failed.')
    } finally {setBusy(false);event.target.value=''}
  }

  async function runAnalysis() {
    if(!application||!selectedResume){setError('Select or upload a resume before analyzing.');return}
    setBusy(true);setError('');setNotice('');setShowTailoredPreview(false);setAnalysis(null)
    try {
      const selected=await apiRequest<{application:ApplicationRecord}>(`/applications/${application.id}/resume`,{
        method:'PUT',body:JSON.stringify({resumeId:selectedResume}),
      })
      setApplication(selected.application)
      const result=await apiRequest<{application:ApplicationRecord;analysis:Analysis;eligible:boolean}>(`/applications/${application.id}/analyze`,{method:'POST',body:JSON.stringify({})})
      setApplication(result.application)
      setAnalysis(result.analysis)
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Resume analysis failed. Please try again.')
    } finally {setBusy(false)}
  }

  async function generateTailoredResume(regenerate=false) {
    if(!application||!eligible){setError('A match score above 70% is required before tailoring this resume. Please improve your resume and reanalyze.');return}
    setBusy(true);setError('')
    try {
      const result=await apiRequest<{application:ApplicationRecord}>(`/applications/${application.id}/tailor`,{
        method:'POST',body:JSON.stringify({}),
      })
      setApplication(result.application)
      setShowTailoredPreview(true)
      setNotice(regenerate?'✓ Your professional ATS resume has been regenerated. Preview the new version below.':'✓ Your professional ATS resume is ready. Preview it below, download a copy, then apply directly to this job.')
    } catch(reason) {setError(reason instanceof Error?reason.message:'Unable to create a tailored resume. Please try again.')}
    finally {setBusy(false)}
  }

  async function downloadTailoredResume(format:'pdf'|'docx') {
    if(!application?.tailoredResume)return
    setBusy(true);setError('')
    try {
      if(!API_BASE)throw new Error('The API is not configured.')
      const response=await fetch(`${API_BASE}/applications/${application.id}/tailored-resume/download?format=${format}`,{
        credentials:'include',
      })
      if(!response.ok) {
        let message='Could not download the tailored resume.'
        try {const body=await response.json() as {error?:string};message=body.error||message} catch {}
        throw new Error(message)
      }
      const url=URL.createObjectURL(await response.blob())
      const anchor=document.createElement('a')
      anchor.href=url
      anchor.download=`resume-${application.tailoredResume.versionNumber}-ats.${format}`
      anchor.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch(reason) {setError(reason instanceof Error?reason.message:'Unable to download the tailored resume.')}
    finally {setBusy(false)}
  }

  async function submitWithTailoredResume() {
    if(!application?.tailoredResume)return
    setBusy(true);setError('')
    try {
      const confirmation=await apiRequest<{application:ApplicationRecord}>(`/applications/${application.id}/confirm`,{
        method:'POST',body:JSON.stringify({resumeKind:'tailored'}),
      })
      setApplication(confirmation.application)
      await apiRequest<{application:ApplicationRecord}>(`/applications/${application.id}/submit`,{
        method:'POST',body:JSON.stringify({}),
      })
      router.push('/candidate/applications')
    } catch(reason) {setError(reason instanceof Error?reason.message:'Unable to apply with the tailored resume.')}
    finally {setBusy(false)}
  }

  const eligible=Boolean(analysis&&analysis.score>70)
  const stepIndex=analysis?application?.tailoredResume?2:1:0

  if(loading)return <div className="application-shell"><section className="application-card" role="status">Loading job and your saved resumes…</section></div>
  if(!job)return <div className="application-shell"><section className="application-card"><p className="application-error" role="alert">{error||'This opportunity is not available.'}</p><Link href="/candidate/opportunities" className="button secondary">Back to opportunities</Link></section></div>
  if(error)return <div className="application-shell"><section className="application-card"><p className="application-error" role="alert">{error}</p><Link href="/candidate/opportunities" className="button secondary">Back to opportunities</Link></section></div>

  return <div className="application-shell"><div className="application-card job-application-card">
    <Link href={`/candidate/opportunity/${job.id}`} className="back-link"><ArrowLeft size={15}/> Back to opportunity</Link>
    <div className="application-heading"><div><span className="eyebrow">{job.employer.name} · Application journey</span><h1>{job.title}</h1><p>Choose a resume, review its match to this job, then confirm before submitting.</p></div><span className="application-match-note">Resume alignment is not hiring probability.</span></div>
    <nav className="stepper" aria-label="Application progress">{steps.map((label,index)=><div className={index<=stepIndex?'step active':'step'} key={label}><span>{index+1}</span>{index===2?'Preview & apply':label}</div>)}</nav>
    {error&&<p className="application-error" role="alert"><CircleAlert size={17}/>{error}</p>}
    {notice&&<p className="application-notice" role="status">{notice}</p>}
    {hasDraft&&!analysis&&<div className="application-notice" role="status"><p>You have a draft application for this job. Continue where you left off or restart with a new resume.</p><button className="button secondary small" onClick={restartApplication} disabled={busy}><RefreshCw size={14}/> Restart application</button></div>}
    {!analysis&&<section className="application-step-panel"><div className="panel-heading"><div><span className="eyebrow">Step 1</span><h2>Select a resume for this job</h2></div><FileText size={20}/></div>
      {resumes.length>0?<label className="application-resume-select">Saved resumes<select value={selectedResume} onChange={event=>selectSavedResume(event.target.value)} disabled={busy}><option value="">Choose a saved resume</option>{resumes.map(resume=><option key={resume.id} value={resume.id}>{resume.originalFile.originalName} · version {resume.activeVersionNumber}</option>)}</select></label>:<div className="application-empty-resumes"><FileText/><div><b>No saved resumes yet</b><span>Upload a PDF or DOCX resume to continue.</span></div></div>}
      <label className="application-upload-control"><Upload size={17}/><span>{busy?'Uploading resume…':file?file.name:'Upload another PDF or DOCX (maximum 5 MB)'}</span><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadResume} disabled={busy}/></label>
      {activeResume&&<div className="application-resume-summary"><CheckCircle2 size={17}/><span>Selected: <b>{activeResume.originalFile.originalName}</b> · version {activeResume.activeVersionNumber}</span></div>}
      <div className="application-step-actions"><button className="button primary" onClick={()=>runAnalysis()} disabled={busy||!selectedResume}>{busy?'Analyzing resume…':'Analyze resume match'} <ArrowRight size={15}/></button></div>
    </section>}
    {analysis&&<section className="application-step-panel"><div className="panel-heading"><div><span className="eyebrow">Step 2 · Version {analysis.versionNumber}</span><h2>Resume-to-job match</h2></div><button className="button secondary small" onClick={()=>runAnalysis()} disabled={busy}><RefreshCw size={14}/> Reanalyze</button></div>
      <div className="application-score-layout"><div className={eligible?'application-score-ring':'application-score-ring ineligible'}><strong>{analysis.score}%</strong><span>resume match</span></div><div><h3>{eligible?'You can continue with this match':'This resume needs improvement'}</h3><p>{eligible?'A score strictly greater than 70% is required to proceed.':`The required score is above 70%. ${analysis.score===70?'A score of exactly 70% does not qualify.':'Review the missing requirements below and update your resume to document those skills, then reanalyze.'}`}</p><p>{analysis.scoreMeaning}</p></div></div>
      <div className="application-score-factors">{analysis.factors.map(factor=><div key={factor.name}><span>{factor.name} · {Math.round(factor.weight*100)}%</span><b>{factor.score}%</b><progress max={100} value={factor.score} aria-label={`${factor.name} ${factor.score}%`}/></div>)}</div>
      <p className="application-analysis-explanation">{analysis.explanation}</p>
      <div className="application-requirements-grid"><section><h3>Supported by your resume</h3>{analysis.matchedRequirements.length?analysis.matchedRequirements.map(item=><article key={item.requirement}><b>{item.requirement}</b><span>{item.status==='partial'?'Partial evidence':'Matched'}</span>{item.evidence&&<p>“{item.evidence}”</p>}</article>):<p>No documented requirements matched.</p>}</section><section><h3>Not documented</h3>{analysis.missingRequirements.length?analysis.missingRequirements.map(item=><article key={item.requirement}><b>{item.requirement}</b><span>Not found in this resume</span></article>):<p>No undocumented requirements reported.</p>}</section></div>
      {eligible&&<div className="application-tailor-panel"><div><span className="eyebrow">Match above 70% · Next step</span><h3>Generate professional ATS resume</h3><p>Our AI will create a professionally formatted, ATS-optimized resume tailored specifically for this role. It reorganizes your existing experience to highlight relevant skills while maintaining complete accuracy.</p></div>
        {!application?.tailoredResume&&<button className="button primary" onClick={generateTailoredResume} disabled={busy}>{busy?'Generating professional resume…':'Generate ATS resume'} <Sparkles size={15}/></button>}
        {application?.tailoredResume&&<><div className="application-tailored-ready"><CheckCircle2 size={17}/><span><b>Professional resume ready</b> · Version {application.tailoredResume.versionNumber} optimized for {job.title}</span></div>
          <div className="application-step-actions"><button className="button secondary" onClick={()=>setShowTailoredPreview(value=>!value)} aria-expanded={showTailoredPreview}><Eye size={15}/>{showTailoredPreview?'Hide preview':'Preview resume'}</button><button className="button secondary" onClick={()=>downloadTailoredResume('pdf')} disabled={busy}><Download size={15}/>Download PDF</button><button className="button secondary" onClick={()=>downloadTailoredResume('docx')} disabled={busy}><Download size={15}/>Download DOCX</button><button className="button secondary" onClick={()=>generateTailoredResume(true)} disabled={busy}><RefreshCw size={15}/>Regenerate</button><button className="button primary" onClick={submitWithTailoredResume} disabled={busy}>{busy?'Submitting application…':'Apply with this resume'} <ArrowRight size={15}/></button></div>
          {showTailoredPreview&&<article className="application-tailored-preview" aria-label="Professional resume preview"><header><h3>{job.title} · Professional ATS Resume</h3><p>ATS-optimized · Single-column format · Resume version {application.tailoredResume.versionNumber}</p></header>{Object.entries(application.tailoredResume.sections).filter(([,text])=>text.trim()).map(([section,text])=><section key={section}><h4>{section.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase())}</h4><p>{text}</p></section>)}</article>}
        </>}
      </div>}
      {!eligible&&<><div className="application-improvement-tips"><h4>How to improve your match score</h4><p>Review the "Not documented" requirements above and update your resume to include:</p><ul><li>Specific experience with the required skills and technologies</li><li>Quantifiable achievements and metrics (e.g., "Reduced latency by 40%")</li><li>Relevant projects that demonstrate the required expertise</li><li>Certifications or training related to the job requirements</li></ul><p>After updating your resume, upload the new version and reanalyze.</p></div>
        <div className="application-step-actions"><button className="button secondary" onClick={()=>runAnalysis()} disabled={busy||!selectedResume}>{busy?'Analyzing…':'Reanalyze resume'}</button></div></>}
    </section>}
  </div></div>
}
