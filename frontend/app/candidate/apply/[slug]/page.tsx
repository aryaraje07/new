import { JobApplicationFlow } from '@/components/job-application-flow'

export default async function Page({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params
  return <JobApplicationFlow jobId={slug}/>
}
