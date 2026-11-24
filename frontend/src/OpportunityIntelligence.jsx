import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Bookmark, BookOpen, BriefcaseBusiness, CalendarDays, Check, CircleHelp, ClipboardList, GraduationCap, MapPin, RefreshCw, Save, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import api from './api';

const photoFor = category => {
  const text=String(category||'').toLowerCase();
  if(/entrepreneur|business/.test(text)) return '/photos/electronics-innovation-work.jpg';
  if(/research|policy|report/.test(text)) return '/photos/collaborative-innovation-team.jpg';
  if(/technology|digital|innovation/.test(text)) return '/photos/hands-on-technology-prototyping.jpg';
  if(/training|fellowship|intern|scholar/.test(text)) return '/photos/youth-innovation-workshop.jpg';
  return '/photos/youth-digital-learning.jpg';
};
const dateLabel=value=>value?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'No deadline listed';
const statusLabel=value=>String(value||'submitted').replaceAll('_',' ').replace(/^./,first=>first.toUpperCase());

function useDashboardData(endpoint) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const refresh=useCallback(()=>setReload(value=>value+1),[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');api.get(endpoint).then(response=>{if(active)setData(response.data);}).catch(()=>{if(active)setError('We could not load this dashboard. Please try again.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[endpoint,reload]);
  return {data,loading,error,refresh};
}
function DashboardFrame({eyebrow,title,description,children}) {
  return <main className="page-wrap intelligence-page"><div className="intelligence-heading"><div><span className="eyebrow blue-text">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><Link className="button button-outline-dark" to="/opportunities">Browse opportunities <ArrowRight size={16}/></Link></div>{children}</main>;
}
function DashboardState({loading,error,onRetry}) {
  if(loading)return <div className="library-state" role="status">Loading your dashboard…</div>;
  if(error)return <div className="library-state" role="alert"><p>{error}</p><button className="button button-outline-dark" onClick={onRetry}><RefreshCw size={15}/> Try again</button></div>;
  return null;
}
function StatCard({icon:Icon,label,value,note}) {return <article className="intel-stat"><span className="intel-stat-icon"><Icon size={20}/></span><span className="intel-stat-label">{label}</span><strong>{value ?? '—'}</strong>{note&&<small>{note}</small>}</article>;}
function ProfileField({label,name,value,onChange,placeholder,rows=1,maxLength,required=false,type='text'}) {
  const Control=rows>1?'textarea':'input';
  return <label className="intel-field"><span>{label}</span><Control name={name} type={rows>1?undefined:type} value={value||''} onChange={onChange} placeholder={placeholder} rows={rows>1?rows:undefined} maxLength={maxLength} required={required}/></label>;
}
function YouthDashboard() {
  const {data,loading,error,refresh}=useDashboardData('/intelligence/youth');
  const [form,setForm]=useState(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[saveError,setSaveError]=useState(''),[expanded,setExpanded]=useState(null);
  useEffect(()=>{if(data?.profile)setForm({...data.profile});},[data]);
  const onChange=event=>setForm(current=>({...current,[event.target.name]:event.target.value}));
  const saveProfile=async event=>{event.preventDefault();setSaving(true);setNotice('');setSaveError('');try{await api.put('/intelligence/profile',form);setNotice('Your profile has been saved.');refresh();}catch(requestError){setSaveError(requestError.response?.data?.message||'Your profile could not be saved.');}finally{setSaving(false);}};
  const toggleSaved=async id=>{try{const savedIds=new Set((data?.saved||[]).map(item=>item.id));if(savedIds.has(id))await api.delete(`/intelligence/saved-opportunities/${id}`);else await api.post(`/intelligence/saved-opportunities/${id}`);refresh();}catch(requestError){setSaveError(requestError.response?.data?.message||'We could not update saved opportunities.');}};
  const savedIds=new Set((data?.saved||[]).map(item=>item.id));
  return <DashboardFrame eyebrow="AFRIYOUTH OPPORTUNITY INTELLIGENCE" title="Build your next step." description="Keep your profile current to see clear, explainable connections to opportunities, programs and resources.">
    <DashboardState loading={loading} error={error} onRetry={refresh}/>{!loading&&!error&&data&&<>
      <section className="intel-stats"><StatCard icon={Sparkles} label="Profile completion" value={`${data.profileCompletion}%`} note="Based on six profile sections"/><StatCard icon={BriefcaseBusiness} label="Direct profile matches" value={data.matches.filter(item=>item.hasMatch).length} note="Using published, non-demo listings"/><StatCard icon={ClipboardList} label="Applications" value={data.applications.length} note="Private to your account"/></section>
      <div className="intel-main-grid">
        <section className="intel-panel profile-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">YOUR PROFILE</span><h2>Tell us what you bring</h2><p>Only details you enter are used to compare your profile with listing text.</p></div><GraduationCap size={23}/></div>
          {form&&<><div className="completion-wrap"><div className="completion-track" role="progressbar" aria-label="Profile completion" aria-valuenow={data.profileCompletion} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${data.profileCompletion}%`}}/></div><strong>{data.profileCompletion}% complete</strong></div>
          <p className="completion-tip"><CircleHelp size={16}/> Add your education, skills, interests, goals, city and country to improve the rule-based comparisons.</p>
          <form className="intel-form" onSubmit={saveProfile}>
            <ProfileField label="Education" name="education" value={form.education} onChange={onChange} placeholder="Qualification, field or current study" maxLength={300}/>
            <ProfileField label="Skills (separate with commas or new lines)" name="skills" value={form.skills} onChange={onChange} placeholder="Research, data analysis, facilitation" rows={3} maxLength={2500}/>
            <ProfileField label="Interests (separate with commas or new lines)" name="interests" value={form.interests} onChange={onChange} placeholder="Climate, entrepreneurship, digital learning" rows={3} maxLength={2500}/>
            <div className="intel-form-row"><ProfileField label="City" name="city" value={form.city} onChange={onChange} placeholder="City" maxLength={100}/><ProfileField label="Country" name="country" value={form.country} onChange={onChange} placeholder="Country" maxLength={100}/></div>
            <ProfileField label="Career goals" name="career_goals" value={form.career_goals} onChange={onChange} placeholder="What would you like to work toward?" rows={3} maxLength={1500}/>
            {saveError&&<p className="inline-error" role="alert">{saveError}</p>}{notice&&<p className="inline-success" role="status">{notice}</p>}
            <button className="button button-primary" disabled={saving}>{saving?'Saving…':'Save my profile'} <Save size={16}/></button>
          </form></>}
        </section>
        <section className="intel-panel match-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">SMART OPPORTUNITY MATCHING</span><h2>Recommendations from your profile</h2><p>Rule-based matches, with the matching evidence shown on each card.</p></div><Sparkles size={22}/></div>
          <div className="matching-explainer"><ShieldCheck size={18}/><p>We compare the skills and interests you entered with each approved listing’s title, category and description. This is a transparent text match, not an AI prediction or eligibility decision.</p></div>
          {!data.matches.length?<div className="empty-state"><h3>No active opportunities to compare</h3><p>Check back later or browse the published listings.</p><Link className="text-link" to="/opportunities">Browse opportunities <ArrowRight size={16}/></Link></div>:<div className="match-list">{data.matches.map(item=><article className="match-card" key={item.id}>
            <img src={photoFor(item.category)} alt="" loading="lazy"/><div className="match-card-content"><div className="match-topline"><span className="card-kicker">{item.category||'Opportunity'}</span><button className={savedIds.has(item.id)?'save-opportunity saved':'save-opportunity'} onClick={()=>toggleSaved(item.id)} aria-label={savedIds.has(item.id)?'Remove saved opportunity':'Save opportunity'} title={savedIds.has(item.id)?'Remove saved opportunity':'Save opportunity'}><Bookmark size={17} fill={savedIds.has(item.id)?'currentColor':'none'}/></button></div>
              <h3><Link to={`/opportunities/${item.id}`}>{item.title}</Link></h3><p className="match-meta">{item.organization_name||'Organization'} · {item.location||'Location not listed'} · Deadline {dateLabel(item.deadline)}</p>
              {item.reasons.length?<ul className="match-reasons">{item.reasons.map(reason=><li key={reason}><Check size={15}/>{reason}</li>)}</ul>:<p className="no-match-note">No direct profile overlap was found in the listing text. Review the requirements manually before applying.</p>}
              {item.eligibility&&<details className="criteria-details"><summary>Eligibility to check</summary><p>{item.eligibility}</p></details>}
              {item.requirementsNotInProfile.length>0&&<details className="criteria-details"><summary>Criteria not listed on your profile ({item.requirementsNotInProfile.length})</summary><p>These are listing requirements not found in your skills field. They may apply to you; confirm each before treating it as a skills gap.</p><ul>{item.requirementsNotInProfile.map(value=><li key={value}>{value}</li>)}</ul></details>}
              <Link className="text-link" to={`/opportunities/${item.id}`}>Review opportunity <ArrowRight size={15}/></Link>
            </div></article>)}</div>}
        </section>
      </div>
      <section className="intel-panel pathway-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">SKILLS GAP ANALYSIS</span><h2>Learning paths from listed content</h2><p>Suggestions are drawn from published AfriYouth resources and programs, matched against criteria not listed on your profile.</p></div><BookOpenIcon/></div>
        {!data.pathways.length?<p className="empty-inline">Add skills to your profile and review listing criteria to see relevant published learning materials here. We only recommend content currently in the database.</p>:<div className="pathway-grid">{data.pathways.map(entry=><article key={entry.gap}><span className="gap-label">To review: {entry.gap}</span>{entry.matches.map(match=><p key={`${match.kind}-${match.id}`}><Link to={match.kind==='resource'?`/resources/${match.id}`:'/programs'}>{match.title}</Link><span>{match.kind==='resource'?'Resource':'Program'} · {match.category||'AfriYouth'}</span></p>)}</article>)}</div>}
      </section>
      <div className="intel-bottom-grid"><section className="intel-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">APPLICATION TRACKER</span><h2>Your applications</h2><p>Visible only to you and the authorized opportunity organization.</p></div><ClipboardList size={22}/></div>
        {!data.applications.length?<p className="empty-inline">Applications you submit through AfriYouth will appear here.</p>:<div className="tracker-list">{data.applications.map(application=><article className="tracker-item" key={application.id}><div><h3><Link to={`/opportunities/${application.opportunity_id}`}>{application.title}</Link></h3><p>{application.organization_name||'Organization'} · Applied {dateLabel(application.created_at)}</p><p className="next-step">Next step: {nextStep(application.status)}{application.application_url&&<> <a href={application.application_url} target="_blank" rel="noreferrer">Open organization instructions</a></>}</p></div><span className={`status-pill status-${application.status}`}>{statusLabel(application.status)}</span></article>)}</div>}
        </section><section className="intel-panel saved-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">SAVED OPPORTUNITIES</span><h2>Your shortlist</h2></div><Bookmark size={21}/></div>
          {!data.saved.length?<p className="empty-inline">Save a published opportunity to keep it here for later.</p>:<ul className="saved-list">{data.saved.map(item=><li key={item.id}><Link to={`/opportunities/${item.id}`}>{item.title}</Link><span>{item.category} · {item.location||'Location not listed'}</span><button onClick={()=>toggleSaved(item.id)} aria-label={`Remove ${item.title} from saved opportunities`}><X size={15}/></button></li>)}</ul>}
        </section></div>
    </>}
  </DashboardFrame>;
}
function BookOpenIcon(){return <BookOpen size={22}/>;}
function nextStep(status){return ({submitted:'Your application is recorded. Check the opportunity details for the organization’s stated next steps.',under_review:'Your application is under review. Check the opportunity details for follow-up instructions.',shortlisted:'You are marked as shortlisted. Review the organization’s instructions and application link.',accepted:'Your application is marked accepted. Review the organization’s instructions for what follows.',rejected:'Your application is marked rejected. Contact the organization through its published details if you need clarification.'})[status]||'Check the opportunity details for next steps.';}

function OpportunityForm({onCreated}) {
  const [form,setForm]=useState({title:'',category:'Internships',opportunity_type:'',summary:'',description:'',eligibility:'',location:'',deadline:'',application_url:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const change=event=>setForm(current=>({...current,[event.target.name]:event.target.value}));
  const submit=async event=>{event.preventDefault();setBusy(true);setError('');setMessage('');try{const response=await api.post('/opportunities',form);setMessage(response.data.message);setForm({title:'',category:'Internships',opportunity_type:'',summary:'',description:'',eligibility:'',location:'',deadline:'',application_url:''});onCreated();}catch(requestError){setError(requestError.response?.data?.message||'The opportunity could not be submitted.');}finally{setBusy(false);}};
  return <form className="intel-form opportunity-create-form" onSubmit={submit}><div className="intel-panel-heading"><div><span className="panel-kicker">SUBMIT FOR APPROVAL</span><h2>Post an opportunity</h2><p>New listings remain private until an administrator publishes them.</p></div><BriefcaseBusiness size={22}/></div>
    <ProfileField label="Opportunity title" name="title" value={form.title} onChange={change} maxLength={200} required/>
    <div className="intel-form-row"><ProfileField label="Category" name="category" value={form.category} onChange={change} placeholder="Internships, Scholarships, Training…" required/><ProfileField label="Opportunity type" name="opportunity_type" value={form.opportunity_type} onChange={change} placeholder="Full-time, Remote, Fellowship…"/></div>
    <ProfileField label="Short summary" name="summary" value={form.summary} onChange={change} rows={2} maxLength={500} required/>
    <ProfileField label="Full description" name="description" value={form.description} onChange={change} rows={5} required/>
    <ProfileField label="Eligibility and requirements" name="eligibility" value={form.eligibility} onChange={change} rows={3}/>
    <div className="intel-form-row"><ProfileField label="Location or remote status" name="location" value={form.location} onChange={change}/><ProfileField label="Application deadline" name="deadline" value={form.deadline} onChange={change} type="date"/></div>
    <ProfileField label="Application URL (optional)" name="application_url" value={form.application_url} onChange={change} placeholder="https://" type="url"/>
    {error&&<p className="inline-error" role="alert">{error}</p>}{message&&<p className="inline-success" role="status">{message}</p>}
    <button className="button button-primary" disabled={busy}>{busy?'Submitting…':'Submit for admin approval'} <ArrowRight size={16}/></button>
  </form>;
}
function OrganizationDashboard() {
  const {data,loading,error,refresh}=useDashboardData('/intelligence/organization');
  const [reviewing,setReviewing]=useState(null),[notice,setNotice]=useState('');
  const review=async(id,status)=>{setReviewing(id);setNotice('');try{await api.patch(`/intelligence/organization/applications/${id}`,{status});setNotice('Application review status updated.');refresh();}catch(requestError){setNotice(requestError.response?.data?.message||'The application could not be updated.');}finally{setReviewing(null);}};
  const manage=async(id,status)=>{try{await api.patch(`/intelligence/organization/opportunities/${id}`,{status});refresh();}catch(requestError){setNotice(requestError.response?.data?.message||'The opportunity could not be updated.');}};
  const stats=data?.applicationStats||{};
  return <DashboardFrame eyebrow="ORGANIZATION WORKSPACE" title="Manage opportunities and applicants." description="Review the performance of your real listings and handle applications submitted to your organization.">
    <DashboardState loading={loading} error={error} onRetry={refresh}/>{!loading&&!error&&data&&<>
      <section className="intel-stats"><StatCard icon={BriefcaseBusiness} label="Your opportunities" value={data.opportunities.filter(item=>!item.is_demo).length} note="Non-demo records"/><StatCard icon={Check} label="Published listings" value={data.opportunities.filter(item=>item.status==='published'&&!item.is_demo).length}/><StatCard icon={ClipboardList} label="Applications" value={stats.total||0} note="Non-demo opportunities"/><StatCard icon={Users} label="Under review" value={stats.under_review||0}/></section>
      <div className="intel-org-grid"><section className="intel-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">YOUR LISTINGS</span><h2>Opportunity management</h2><p>Submissions need admin approval before they are public.</p></div></div>
        {!data.opportunities.length?<p className="empty-inline">Your organization has not submitted opportunities yet.</p>:<div className="org-opportunity-list">{data.opportunities.map(item=><article key={item.id}><div><span className={`status-pill status-${item.status}`}>{statusLabel(item.status)}</span>{item.is_demo&&<span className="demo-tag">Demo</span>}<h3>{item.title}</h3><p>{item.category} · {item.location||'No location listed'} · {item.application_count||0} applications</p></div>{['published','pending'].includes(item.status)&&!item.is_demo&&<button className="button button-outline-dark" onClick={()=>manage(item.id,'closed')}>Close listing <X size={15}/></button>}</article>)}</div>}
      </section><OpportunityForm onCreated={refresh}/></div>
      <section className="intel-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">APPLICATION REVIEW</span><h2>Applicants to your opportunities</h2><p>Applicant details are visible only to the organization that owns the opportunity.</p></div><Users size={22}/></div>
        {notice&&<p className="inline-success" role="status">{notice}</p>}{!data.applications.length?<p className="empty-inline">No applications have been received for your organization.</p>:<div className="application-review-list">{data.applications.map(application=><article key={application.id}><div className="application-person"><span className={`status-pill status-${application.status}`}>{statusLabel(application.status)}</span><h3>{application.applicant_name}</h3><p>{application.applicant_email} · {application.title}</p><small>Submitted {dateLabel(application.submitted_at)}{application.deadline?` · Deadline ${dateLabel(application.deadline)}`:''}</small>{application.cover_letter&&<blockquote>{application.cover_letter}</blockquote>}</div><label className="review-status">Update status<select value={application.status} disabled={reviewing===application.id} onChange={event=>review(application.id,event.target.value)}><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="shortlisted">Shortlisted</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></label></article>)}</div>}
      </section>
    </>}
  </DashboardFrame>;
}

function AdminDashboard() {
  const {data,loading,error,refresh}=useDashboardData('/intelligence/admin');
  const [busy,setBusy]=useState(null),[notice,setNotice]=useState('');
  const decide=async(id,status)=>{setBusy(id);setNotice('');try{await api.patch(`/admin/opportunities/${id}`,{status});setNotice(`Opportunity ${status==='published'?'approved and published':'rejected'}.`);refresh();}catch(requestError){setNotice(requestError.response?.data?.message||'The approval decision could not be saved.');}finally{setBusy(null);}};
  const impact=data?.impact||{};
  return <DashboardFrame eyebrow="ADMINISTRATION" title="Platform intelligence." description="Live counts use real, active platform records and exclude demo listings from impact totals.">
    <DashboardState loading={loading} error={error} onRetry={refresh}/>{!loading&&!error&&data&&<>
      <section className="intel-stats impact-stats"><StatCard icon={Users} label="Registered youth" value={impact.registeredYouth}/><StatCard icon={ShieldCheck} label="Approved opportunities" value={impact.approvedOpportunities} note="Published, non-demo records"/><StatCard icon={ClipboardList} label="Applications" value={impact.applications} note="On non-demo opportunities"/><StatCard icon={Award} label="Participating organizations" value={impact.participatingOrganizations} note="Active, verified partners"/></section>
      <section className="intel-panel"><div className="intel-panel-heading"><div><span className="panel-kicker">MODERATION QUEUE</span><h2>Opportunities awaiting approval</h2><p>Only an administrator can make a submitted listing public.</p></div><ShieldCheck size={22}/></div>
        {notice&&<p className="inline-success" role="status">{notice}</p>}{!data.pendingOpportunities.length?<p className="empty-inline">There are no real opportunity submissions awaiting approval.</p>:<div className="approval-list">{data.pendingOpportunities.map(item=><article key={item.id}><img src={photoFor(item.category)} alt=""/><div className="approval-content"><span className="card-kicker">{item.category||'Opportunity'} · {item.organization_name||'Organization not listed'}</span><h3>{item.title}</h3><p>{item.summary}</p>{item.eligibility&&<p><strong>Eligibility:</strong> {item.eligibility}</p>}{item.location&&<p><MapPin size={14}/>{item.location}</p>}{item.deadline&&<p><CalendarDays size={14}/>Deadline {dateLabel(item.deadline)}</p>}<details><summary>Full description and requirements</summary><p>{item.description}</p>{item.requirements&&<p>{item.requirements}</p>}</details><div className="approval-actions"><button className="button button-primary" disabled={busy===item.id} onClick={()=>decide(item.id,'published')}><Check size={16}/> Approve and publish</button><button className="button button-outline-dark" disabled={busy===item.id} onClick={()=>decide(item.id,'rejected')}><X size={16}/> Reject</button></div></div></article>)}</div>}
      </section>
    </>}
  </DashboardFrame>;
}

export default function OpportunityIntelligence() {
  const user=JSON.parse(localStorage.getItem('afriyouth_user')||'null');
  if(!user)return <main className="page-wrap narrow"><div className="library-state"><h1>Sign in to continue</h1><p>AfriYouth Opportunity Intelligence uses your private profile and account permissions.</p><Link className="button button-primary" to="/login">Sign in <ArrowRight size={16}/></Link></div></main>;
  if(user.role==='youth')return <YouthDashboard/>;
  if(user.role==='partner')return <OrganizationDashboard/>;
  if(user.role==='admin')return <AdminDashboard/>;
  return <main className="page-wrap narrow"><div className="library-state"><h1>Dashboard access unavailable</h1><p>This account does not have a recognized dashboard role.</p></div></main>;
}
