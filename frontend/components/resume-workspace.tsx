'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowDownToLine, ArrowRight, Check, CheckCircle2, Clock3, FileText, RotateCcw, Sparkles, Upload, X } from 'lucide-react'

type ResumeSectionName = 'contactInformation'|'summary'|'education'|'skills'|'experience'|'projects'|'certifications'|'achievements'|'other'
type ResumeSections = Record<ResumeSectionName, string>
type SuggestionStatus = 'pending'|'edited'|'accepted'|'rejected'

type ResumeVersion = { versionNumber: number; label: string; createdAt: string; sections?: ResumeSections }
type ResumeRecord = {
  id: string
  originalFile: { originalName: string; format: 'pdf'|'docx'; size: number }
  activeVersionNumber: number
  versions: ResumeVersion[]
  activeVersion?: ResumeVersion
  extractedText?: string
}
type Requirement = { requirement: string; status: 'matched'|'partial'|'not_documented'; evidence: string }
type Suggestion = {
  suggestionId: string
  section: ResumeSectionName
  originalText: string
  proposedText: string
  reason: string
  relevantRequirement: string
  evidence: string
  verificationNote: string
  status: SuggestionStatus
}
type Analysis = {
  id: string
  resumeId: string
  versionNumber: number
  target: { title: string; description: string; type: 'custom'|'opportunity'|'resume_review' }
  score: number
  scoreMeaning: string
  factors: { name: string; score: number; weight: number; explanation: string }[]
  matchedRequirements: Requirement[]
  missingRequirements: Requirement[]
  explanation: string
  limitations: string[]
  suggestions: Suggestion[]
  outdated: boolean
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || ''
const sectionLabels: Record<ResumeSectionName,string> = {
  contactInformation: 'Contact information',
  summary: 'Professional summary',
  education: 'Education',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  certifications: 'Certifications',
  achievements: 'Achievements',
  other: 'Other',
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error('The API is not configured. Set NEXT_PUBLIC_API_URL and restart the frontend.')
  const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include' })
  if (!response.ok) {
    let message = 'The request could not be completed.'
    try {
      const body = await response.json() as { error?: string }
      if (body.error) message = body.error
    } catch {
      message = response.status === 401 ? 'Please log in to use Resume Studio.' : message
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

function WorkspaceShell({ mode, children }: { mode: 'studio'|'analyzer'; children: React.ReactNode }) {
  const isStudio = mode === 'studio'
  return <div className="feature-workspace resume-workspace">
    <div className="workspace-intro">
      <div><span className="eyebrow">{isStudio ? 'Shape your story' : 'Understand your role match'}</span><h2>{isStudio ? 'Resume Studio' : 'ATS Resume Analyzer'}</h2><p>{isStudio ? 'Upload your resume, review role-specific suggestions and build a version you control.' : 'Review evidence-backed alignment with a selected role. The score is not an ATS pass or hiring prediction.'}</p></div>
      <span className="workspace-status"><CheckCircle2 size={14}/> Connected resume workspace</span>
    </div>
    {children}
  </div>
}

export function ResumeWorkspace({ mode = 'studio' }: { mode?: 'studio'|'analyzer' }) {
  const [resumes,setResumes]=useState<ResumeRecord[]>([])
  const [resumeId,setResumeId]=useState('')
  const [resume,setResume]=useState<ResumeRecord|null>(null)
  const [analysis,setAnalysis]=useState<Analysis|null>(null)
  const [analyses,setAnalyses]=useState<Analysis[]>([])
  const [file,setFile]=useState<File|null>(null)
  const [jobTitle,setJobTitle]=useState('')
  const [jobDescription,setJobDescription]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [selectedSuggestions,setSelectedSuggestions]=useState<string[]>([])
  const [previewSections,setPreviewSections]=useState<ResumeSections|null>(null)
  const [previewIds,setPreviewIds]=useState<string[]>([])
  const [editedText,setEditedText]=useState<Record<string,string>>({})

  const activeVersion=resume?.activeVersion
  const suggestionsByStatus=useMemo(()=>({
    pending:analysis?.suggestions.filter(item=>item.status==='pending'||item.status==='edited').length||0,
  }),[analysis])

  const loadResumeList=useCallback(async (selectedId?:string) => {
    setLoading(true)
    setError('')
    try {
      const result=await apiRequest<{resumes:ResumeRecord[]}>('/resumes')
      setResumes(result.resumes)
      const id=selectedId||result.resumes[0]?.id||''
      setResumeId(id)
      if(id) {
        const [details,history]=await Promise.all([
          apiRequest<{resume:ResumeRecord}>(`/resumes/${id}`),
          apiRequest<{analyses:Analysis[]}>(`/resumes/${id}/analyses`),
        ])
        setResume(details.resume)
        setAnalyses(history.analyses)
        setAnalysis(history.analyses[0]||null)
      } else {
        setResume(null)
        setAnalyses([])
        setAnalysis(null)
      }
    } catch (cause) {
      setError(cause instanceof Error?cause.message:'Could not load your resumes.')
    } finally {
      setLoading(false)
    }
  },[])

  useEffect(()=>{ void loadResumeList() },[loadResumeList])

  async function refreshResume(id=resumeId) {
    if(!id) return
    const [details,history]=await Promise.all([
      apiRequest<{resume:ResumeRecord}>(`/resumes/${id}`),
      apiRequest<{analyses:Analysis[]}>(`/resumes/${id}/analyses`),
    ])
    setResume(details.resume)
    setAnalyses(history.analyses)
    if(analysis) {
      const current=await apiRequest<{analysis:Analysis}>(`/resumes/analyses/${analysis.id}`)
      setAnalysis(current.analysis)
    } else setAnalysis(history.analyses[0]||null)
    setPreviewSections(null)
    setPreviewIds([])
    setSelectedSuggestions([])
  }

  async function onSelectResume(event:ChangeEvent<HTMLSelectElement>) {
    const id=event.target.value
    setResumeId(id)
    setAnalysis(null)
    setNotice('')
    setError('')
    try {
      const [details,history]=await Promise.all([
        apiRequest<{resume:ResumeRecord}>(`/resumes/${id}`),
        apiRequest<{analyses:Analysis[]}>(`/resumes/${id}/analyses`),
      ])
      setResume(details.resume)
      setAnalyses(history.analyses)
      setAnalysis(history.analyses[0]||null)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not load that resume.')
    }
  }

  async function uploadResume(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!file) return setError('Choose a PDF or DOCX file first.')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const form=new FormData()
      form.append('resume',file)
      const result=await apiRequest<{resume:ResumeRecord}>('/resumes',{method:'POST',body:form})
      setFile(null)
      await loadResumeList(result.resume.id)
      if(mode==='studio') {
        setNotice('Resume uploaded. Starting your quality review…')
        await analyzeResumeQuality(result.resume.id,result.resume.activeVersionNumber)
      } else {
        setNotice('Resume uploaded and saved securely.')
      }
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Resume upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function analyzeResumeQuality(id=resumeId,versionNumber=resume?.activeVersionNumber) {
    if(!id)return setError('Upload or select a resume first.')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result=await apiRequest<{analysis:Analysis}>(`/resumes/${id}/analyses`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({versionNumber,target:{type:'resume_review'}}),
      })
      setAnalysis(result.analysis)
      setAnalyses(previous=>[result.analysis,...previous.filter(item=>item.id!==result.analysis.id)])
      setSelectedSuggestions([])
      setPreviewSections(null)
      setPreviewIds([])
      setNotice('Resume review complete. Check your score and review the suggested fixes below.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'The resume could not be analyzed.')
    } finally {
      setBusy(false)
    }
  }

  async function createAnalysis(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!resumeId) return setError('Upload or select a resume first.')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result=await apiRequest<{analysis:Analysis}>(`/resumes/${resumeId}/analyses`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({versionNumber:resume?.activeVersionNumber,target:{type:'custom',title:jobTitle,description:jobDescription}}),
      })
      setAnalysis(result.analysis)
      setAnalyses(previous=>[result.analysis,...previous])
      setSelectedSuggestions([])
      setPreviewSections(null)
      setNotice('Analysis complete. Review the evidence and suggestions before applying changes.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'The resume could not be analyzed.')
    } finally {
      setBusy(false)
    }
  }

  async function openAnalysis(id:string) {
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{analysis:Analysis}>(`/resumes/analyses/${id}`)
      setAnalysis(result.analysis)
      setJobTitle(result.analysis.target.title)
      setJobDescription(result.analysis.target.description)
      setSelectedSuggestions([])
      setPreviewSections(null)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not load analysis.')
    } finally {
      setBusy(false)
    }
  }

  async function updateSuggestion(suggestion:Suggestion,action:'edit'|'reject') {
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{analysis:Analysis}>(`/resumes/analyses/${analysis?.id}/suggestions/${suggestion.suggestionId}`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(action==='edit'?{action,proposedText:editedText[suggestion.suggestionId]??suggestion.proposedText}:{action}),
      })
      setAnalysis(result.analysis)
      setAnalyses(previous=>previous.map(item=>item.id===result.analysis.id?result.analysis:item))
      setNotice(action==='edit'?'Suggestion updated. Review it before applying.':'Suggestion rejected.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not update suggestion.')
    } finally {
      setBusy(false)
    }
  }

  async function previewSelected(ids=selectedSuggestions) {
    if(!analysis||!ids.length) return setError('Select at least one suggestion to preview.')
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{sections:ResumeSections;selectedSuggestionIds:string[]}>(`/resumes/analyses/${analysis.id}/preview`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({suggestionIds:ids}),
      })
      setPreviewSections(result.sections)
      setPreviewIds(result.selectedSuggestionIds)
      setNotice('Review the combined resume draft below. The original resume has not been changed.')
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not preview these suggestions.')
    } finally {
      setBusy(false)
    }
  }

  async function applyPreview() {
    if(!analysis||!previewIds.length) return
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{resume:ResumeRecord;analysis:Analysis}>(`/resumes/analyses/${analysis.id}/apply`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({suggestionIds:previewIds}),
      })
      setResume(result.resume)
      setAnalysis(result.analysis)
      setPreviewSections(null)
      setPreviewIds([])
      setSelectedSuggestions([])
      setNotice(`Saved as resume version ${result.resume.activeVersionNumber}. Your original upload is unchanged.`)
      await refreshResume(resumeId)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not save the reviewed changes.')
    } finally {
      setBusy(false)
    }
  }

  async function restoreVersion(versionNumber:number) {
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{resume:ResumeRecord}>(`/resumes/${resumeId}/versions/${versionNumber}/restore`,{method:'POST'})
      setResume(result.resume)
      await refreshResume(resumeId)
      setNotice(`Restored version ${versionNumber} as a new draft version.`)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not restore that version.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadResume() {
    if(!resumeId||!resume) return
    setBusy(true)
    setError('')
    try {
      if(!API_BASE) throw new Error('The API is not configured.')
      const response=await fetch(`${API_BASE}/resumes/${resumeId}/download`,{credentials:'include'})
      if(!response.ok) {
        const body=await response.json() as {error?:string}
        throw new Error(body.error||'Could not download the original resume.')
      }
      const url=URL.createObjectURL(await response.blob())
      const anchor=document.createElement('a')
      anchor.href=url
      anchor.download=resume.originalFile.originalName
      anchor.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not download the resume.')
    } finally {
      setBusy(false)
    }
  }

  async function exportResume(format:'pdf'|'docx') {
    if(!resumeId||!resume) return
    setBusy(true)
    setError('')
    try {
      const result=await apiRequest<{export:{downloadEndpoint:string}}>(`/resumes/${resumeId}/versions/${resume.activeVersionNumber}/export`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({format}),
      })
      if(!API_BASE) throw new Error('The API is not configured.')
      const response=await fetch(`${API_BASE}${result.export.downloadEndpoint}`,{credentials:'include'})
      if(!response.ok) throw new Error('The exported document could not be downloaded.')
      const url=URL.createObjectURL(await response.blob())
      const anchor=document.createElement('a')
      anchor.href=url
      anchor.download=`rozgarlink-resume-v${resume.activeVersionNumber}.${format}`
      anchor.click()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      setNotice(`Version ${resume.activeVersionNumber} exported as ${format.toUpperCase()}.`)
    } catch(cause) {
      setError(cause instanceof Error?cause.message:'Could not export this resume version.')
    } finally {
      setBusy(false)
    }
  }

  function toggleSuggestion(id:string) {
    setSelectedSuggestions(previous=>previous.includes(id)?previous.filter(item=>item!==id):[...previous,id])
  }

  const availableSuggestions=analysis?.suggestions.filter(item=>item.status==='pending'||item.status==='edited')||[]
  const isStudio=mode==='studio'

  return <WorkspaceShell mode={mode}>
    {error&&<div className="resume-alert error" role="alert">{error}</div>}
    {notice&&<div className="resume-alert success" role="status">{notice}</div>}
    <div className="resume-toolbar panel">
      <label className="resume-select-label">Your resume
        <select value={resumeId} onChange={onSelectResume} disabled={loading||busy}>
          <option value="">Select an uploaded resume</option>
          {resumes.map(item=><option key={item.id} value={item.id}>{item.originalFile.originalName}</option>)}
        </select>
      </label>
      {resume&&<div className="resume-meta"><span><FileText size={14}/>{resume.originalFile.format.toUpperCase()}</span><span><Clock3 size={14}/>Version {resume.activeVersionNumber}</span><button className="button secondary small" type="button" onClick={downloadResume} disabled={busy}><ArrowDownToLine size={14}/> Original</button></div>}
    </div>
    {resume&&<form className="resume-upload-inline" onSubmit={uploadResume}><label>Upload another resume<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event=>setFile(event.target.files?.[0]||null)}/></label><button type="submit" className="button secondary small" disabled={!file||busy}>Add resume <Upload size={13}/></button></form>}
    {!resume&&<section className="panel resume-upload-panel">
      <div className="resume-empty-icon"><Upload size={22}/></div><h3>{loading?'Loading your resumes…':'Upload your resume to get started'}</h3><p>Upload a text-based PDF or DOCX. Files are private and only available to your account.</p>
      <form className="resume-upload-form" onSubmit={uploadResume}>
        <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event=>setFile(event.target.files?.[0]||null)} aria-label="Choose a resume PDF or DOCX"/>
        <button type="submit" className="button primary" disabled={!file||busy}>{busy?'Uploading…':'Upload resume'} <Upload size={15}/></button>
      </form>
      <small>PDFs without selectable text need OCR before analysis. Maximum file size: 5 MB.</small>
    </section>}
    {resume&&<>
      <div className="resume-layout">
        <section className="panel resume-target-panel">
          <div className="panel-heading"><div><span className="eyebrow">{isStudio?'General resume review':'Custom role analysis'}</span><h3>{isStudio?'Review your resume':'Choose a target role'}</h3></div><Sparkles size={18}/></div>
          {isStudio
            ? <><p className="resume-muted">Get a quality score and practical fixes for clarity, impact, organization, and readability. No job description is needed.</p><button className="button primary full" type="button" onClick={()=>analyzeResumeQuality()} disabled={busy}>{busy?'Analyzing…':'Analyze resume'} <Sparkles size={15}/></button></>
            : <><p className="resume-muted">Compare your resume with a specific job description to see which requirements are supported by your resume.</p><form className="resume-analysis-form" onSubmit={createAnalysis}>
              <label>Target role title<input required minLength={2} maxLength={160} value={jobTitle} onChange={event=>setJobTitle(event.target.value)} placeholder="e.g. Junior Data Analyst"/></label>
              <label>Job description<textarea required minLength={50} maxLength={16000} rows={8} value={jobDescription} onChange={event=>setJobDescription(event.target.value)} placeholder="Paste the job description, including responsibilities and requirements."/></label>
              <button className="button primary full" disabled={busy}>{busy?'Analyzing…':'Analyze this resume'} <Sparkles size={15}/></button>
            </form></>}
          {analyses.length>0&&<div className="resume-history"><h4>Previous analyses</h4>{analyses.map(item=><button type="button" key={item.id} className={analysis?.id===item.id?'resume-history-item active':'resume-history-item'} onClick={()=>openAnalysis(item.id)} disabled={busy}><span>{item.target.title}</span><small>{item.score}/100 · version {item.versionNumber}{item.outdated?' · outdated':''}</small></button>)}</div>}
        </section>
        <section className="panel resume-current-panel">
          <div className="panel-heading"><div><span className="eyebrow">Current working draft</span><h3>{activeVersion?.label||`Version ${resume.activeVersionNumber}`}</h3></div><FileText size={18}/></div>
          <p className="resume-muted">Your uploaded source remains unchanged. Accepted edits create a separate version.</p>
          <div className="resume-version-list">{resume.versions.map(version=><div className="resume-version-row" key={version.versionNumber}><span><b>v{version.versionNumber}</b>{version.label}</span>{version.versionNumber!==resume.activeVersionNumber&&<button className="button secondary small" type="button" onClick={()=>restoreVersion(version.versionNumber)} disabled={busy}><RotateCcw size={13}/> Restore</button>}</div>)}</div>
          {activeVersion?.sections&&<details className="resume-preview-details"><summary>Preview saved resume content</summary><div className="resume-saved-preview">{Object.entries(activeVersion.sections).filter(([,text])=>text?.trim()).map(([key,text])=><section key={key}><h4>{sectionLabels[key as ResumeSectionName]}</h4><p>{text}</p></section>)}</div></details>}
          <div className="resume-export-actions"><button className="button secondary" type="button" onClick={()=>exportResume('docx')} disabled={busy}>Export DOCX</button><button className="button primary" type="button" onClick={()=>exportResume('pdf')} disabled={busy}>Export PDF</button></div>
        </section>
      </div>
      {analysis&&<section className="resume-analysis-results">
          {!isStudio&&<p className="resume-studio-link"><Link href="/candidate/resume-studio">Open Resume Studio to edit or apply suggestions <ArrowRight size={14}/></Link></p>}
        <div className="resume-score-grid">
          <section className="panel resume-score-card"><span className="eyebrow">{analysis.target.type==='resume_review'?'Overall resume score':'Resume-to-role alignment'}</span><div className="resume-big-score">{analysis.score}<span>/100</span></div><div className="resume-score-bar"><i style={{width:`${analysis.score}%`}}/></div><p>{analysis.scoreMeaning}</p><p>{analysis.explanation}</p>{analysis.outdated&&<div className="resume-alert warning">This analysis was made on an earlier version. Reanalyze before relying on it.</div>}</section>
          <section className="panel resume-factors"><div className="panel-heading"><h3>Score breakdown</h3></div>{analysis.factors.map(factor=><div className="resume-factor" key={factor.name}><div><b>{factor.name}</b><span>{Math.round(factor.weight*100)}% weight</span></div><p>{factor.explanation}</p><div className="resume-factor-meter"><i style={{width:`${factor.score}%`}}/></div><small>{factor.score}/100</small></div>)}</section>
        </div>
        <div className="resume-evidence-grid">
          <section className="panel resume-evidence-card"><div className="panel-heading"><h3>{analysis.target.type==='resume_review'?'Strong points':'Supported requirements'}</h3><CheckCircle2 size={17}/></div>{analysis.matchedRequirements.length?analysis.matchedRequirements.map((item,index)=><article className="resume-requirement" key={`${item.requirement}-${index}`}><b>{item.requirement}<span className={`resume-requirement-status ${item.status}`}>{item.status==='matched'?'Strong':'Could improve'}</span></b><p>“{item.evidence}”</p></article>):<p className="resume-muted">No requirements had verifiable supporting excerpts.</p>}</section>
          <section className="panel resume-evidence-card"><div className="panel-heading"><h3>{analysis.target.type==='resume_review'?'Focus areas':'Not documented'}</h3><X size={17}/></div>{analysis.missingRequirements.length?analysis.missingRequirements.map((item,index)=><article className="resume-requirement" key={`${item.requirement}-${index}`}><b>{item.requirement}</b><p>{analysis.target.type==='resume_review'?'There was not enough resume content to assess this area.':'Not demonstrated in the resume. This does not mean you lack the skill.'}</p></article>):<p className="resume-muted">No undocumented requirements were identified.</p>}</section>
        </div>
        {analysis.limitations.length>0&&<section className="panel resume-limitations"><h3>Analysis limitations</h3><ul>{analysis.limitations.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
        <section className="panel resume-suggestions">
          <div className="panel-heading"><div><span className="eyebrow">{isStudio?'Review and edit before applying':'Actionable resume improvements'}</span><h3>{analysis.target.type==='resume_review'?'Top fixes':`Suggestions for ${analysis.target.title}`}</h3></div><Sparkles size={18}/></div>
          <p className="resume-muted">Every suggestion replaces text already in the selected resume section. Review the original, evidence and replacement. Suggested changes do not overwrite your upload.</p>
          {analysis.suggestions.map(item=><article className={`resume-suggestion ${item.status}`} key={item.suggestionId}>
            <div className="resume-suggestion-heading"><div><span className="resume-section-tag">{sectionLabels[item.section]}</span><b>{item.status}</b></div>{item.status==='accepted'&&<Check size={16}/>}</div>
            <div className="resume-comparison-grid"><div><span>Original</span><p>{item.originalText}</p></div><div><span>Suggested</span>{isStudio&&(item.status==='pending'||item.status==='edited')?<textarea rows={3} value={editedText[item.suggestionId]??item.proposedText} onChange={event=>setEditedText(previous=>({...previous,[item.suggestionId]:event.target.value}))}/>:<p>{item.proposedText}</p>}</div></div>
            <p className="resume-suggestion-reason"><b>Why:</b> {item.reason}{item.relevantRequirement&&<> <b>{analysis.target.type==='resume_review'?'Review area':'Role requirement'}:</b> {item.relevantRequirement}</>}</p>
            <p className="resume-suggestion-evidence"><b>Resume evidence:</b> “{item.evidence}”</p>
            {item.verificationNote&&<p className="resume-verification-note"><b>Verify:</b> {item.verificationNote}</p>}
            {isStudio&&(item.status==='pending'||item.status==='edited')&&<div className="resume-suggestion-actions">
              <label><input type="checkbox" checked={selectedSuggestions.includes(item.suggestionId)} onChange={()=>toggleSuggestion(item.suggestionId)}/> Select for review</label>
              <button className="button secondary small" type="button" onClick={()=>updateSuggestion(item,'edit')} disabled={busy}>Save edit</button>
              <button className="button secondary small" type="button" onClick={()=>updateSuggestion(item,'reject')} disabled={busy}>Reject</button>
              <button className="button primary small" type="button" onClick={()=>previewSelected([item.suggestionId])} disabled={busy}>Preview change</button>
            </div>}
          </article>)}
          {analysis.suggestions.length===0&&<p className="resume-muted">No safe text replacements were generated for this analysis.</p>}
          {isStudio&&availableSuggestions.length>0&&<div className="resume-bulk-actions"><span>{selectedSuggestions.length} selected · {suggestionsByStatus.pending} available</span><button className="button secondary" type="button" onClick={()=>setSelectedSuggestions(availableSuggestions.map(item=>item.suggestionId))}>Select all</button><button className="button primary" type="button" onClick={()=>previewSelected()} disabled={busy||selectedSuggestions.length===0}>Review selected changes</button></div>}
        </section>
        {previewSections&&<section className="panel resume-review-panel"><div className="panel-heading"><div><span className="eyebrow">Nothing is saved yet</span><h3>Review the combined draft</h3></div><FileText size={18}/></div><p>Check the exact content below. Apply creates a new version and preserves your original upload.</p>{Object.entries(previewSections).filter(([,text])=>text?.trim()).map(([key,text])=><section className="resume-review-section" key={key}><h4>{sectionLabels[key as ResumeSectionName]}</h4><p>{text}</p></section>)}<div className="resume-export-actions"><button type="button" className="button secondary" onClick={()=>{setPreviewSections(null);setPreviewIds([])}} disabled={busy}>Cancel</button><button type="button" className="button primary" onClick={applyPreview} disabled={busy}>{busy?'Saving…':'Apply reviewed changes'} <Check size={15}/></button></div></section>}
      </section>}
    </>}
  </WorkspaceShell>
}
