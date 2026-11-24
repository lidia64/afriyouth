import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Download, ExternalLink, MapPin, Search } from 'lucide-react';
import api from './api';

const photos = {
  learning: '/photos/youth-digital-learning.jpg',
  workshop: '/photos/youth-innovation-workshop.jpg',
  people: '/photos/collaborative-innovation-team.jpg',
  electronics: '/photos/electronics-innovation-work.jpg',
  prototype: '/photos/hands-on-technology-prototyping.jpg',
  future: '/photos/youth-virtual-reality-prototyping.jpg'
};
const resourceCategories = [
  'Research reports and policy briefs', 'Entrepreneurship guides', 'Innovation and technology',
  'Youth development', 'Training guides and toolkits', 'Sustainable development'
];
const publicationCategories = ['Research publications', 'Reports and studies', 'Policy briefs', 'Articles and insights', 'Case studies', 'Newsletters'];
const opportunityCategories = ['Internship', 'Scholarship', 'Training', 'Fellowship', 'Entrepreneurship', 'Innovation challenge', 'Job', 'Volunteering', 'Grant', 'Competition'];
const opportunityTypes = ['Full-time', 'Part-time', 'Remote', 'On-site', 'Hybrid', 'Volunteer', 'Fellowship'];
const imageFor = (category = '', title = '') => {
  const text = `${category} ${title}`.toLowerCase();
  if (/research|policy|report|study|case/.test(text)) return photos.people;
  if (/entrepreneur|business|grant|competition/.test(text)) return photos.electronics;
  if (/innovation|technology|digital|challenge/.test(text)) return photos.prototype;
  if (/training|toolkit|fellowship|internship|scholarship|job|volunteer/.test(text)) return photos.workshop;
  if (/sustainab|climate|environment/.test(text)) return photos.future;
  return photos.learning;
};
const formatDate = value => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
const today = () => new Date(new Date().toDateString());
const expired = item => Boolean(item.deadline && new Date(`${String(item.deadline).slice(0, 10)}T00:00:00`) < today());
const daysUntil = value => Math.ceil((new Date(`${String(value).slice(0, 10)}T00:00:00`) - today()) / 86400000);
const safeDocumentUrl = value => {
  if (!value) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
const resourceType = item => {
  if (item.resource_type && !item.resource_type.toLowerCase().startsWith('image/')) {
    const value = item.resource_type.toLowerCase();
    if (value.includes('pdf')) return 'PDF';
    if (value.includes('word') || value.includes('document')) return 'Document';
    return item.resource_type;
  }
  const path = safeDocumentUrl(item.document_url).split('?')[0].toLowerCase();
  const ext = path.match(/\.([a-z0-9]{2,5})$/)?.[1];
  if (ext === 'pdf') return 'PDF';
  if (['doc','docx','odt'].includes(ext)) return 'Document';
  const text = `${item.category || ''} ${item.title || ''}`.toLowerCase();
  if (text.includes('toolkit')) return 'Toolkit';
  if (text.includes('guide')) return 'Guide';
  if (text.includes('report') || text.includes('research') || text.includes('policy')) return 'Report';
  return 'Resource';
};
const matchesCategory = (selected, actual) => {
  if (!selected) return true;
  const filterText = selected.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const recordText = String(actual || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (filterText.startsWith('youth development')) return /youth|leadership|learning|community/.test(recordText);
  if (filterText.startsWith('sustainable development')) return /sustainab|environment|community/.test(recordText);
  if (filterText.startsWith('innovation and technology')) return /innovation|technology|digital/.test(recordText);
  return Boolean(recordText) && (recordText === filterText || recordText.includes(filterText) || filterText.includes(recordText));
};

function Intro({ title, kicker, description, links }) {
  return <>
    <div className="library-intro"><div><span className="eyebrow blue-text">{kicker}</span><h1>{title}</h1><p>{description}</p></div>
      <nav className="library-switch" aria-label="Explore library sections">{links.map(([label, href]) => <Link key={href} to={href}>{label}</Link>)}</nav>
    </div>
  </>;
}
const libraryLinks = [['Resources', '/resources'], ['Publications', '/publications'], ['Opportunities', '/opportunities']];

function useRecords(endpoint) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.get(endpoint).then(({ data }) => { if (active) setRecords(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  return { records, loading, error };
}

function SearchField({ value, onChange, placeholder }) {
  return <label className="library-search"><Search size={18} aria-hidden="true"/><span className="visually-hidden">Search</span><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/></label>;
}
function SelectFilter({ label, value, onChange, options }) {
  return <label className="filter-field"><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">All {label.toLowerCase()}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}
function Notice({ loading, error, empty, emptyTitle = 'No matching items', emptyCopy = 'Try a different search or filter.' }) {
  if (loading) return <div className="library-state" role="status">Loading content…</div>;
  if (error) return <div className="library-state" role="alert"><h2>Content is temporarily unavailable</h2><p>Please try again in a little while. You can still explore the other library sections above.</p></div>;
  if (empty) return <div className="library-state"><h2>{emptyTitle}</h2><p>{emptyCopy}</p></div>;
  return null;
}

function ContentCard({ item, kind }) {
  const isOpportunity = kind === 'opportunities';
  const image = imageFor(item.category, item.title);
  const date = item.published_on || item.created_at;
  const isExpired = isOpportunity && (expired(item) || item.status === 'closed');
  const detailPath = `/${kind}/${item.id}`;
  return <article className="library-card">
    <Link className="library-card-image" to={detailPath} tabIndex={-1} aria-hidden="true"><img src={image} alt="" loading="lazy"/></Link>
    <div className="library-card-body">
      <div className="library-card-tags"><span className="card-kicker">{item.category || 'AfriYouth'}</span>{isOpportunity && item.opportunity_type && <span className="type-tag">{item.opportunity_type}</span>}{item.is_demo ? <span className="demo-tag">Demo content</span> : null}{isExpired && <span className="expired-tag">Expired</span>}</div>
      <h2><Link to={detailPath}>{item.title}</Link></h2><p className="library-summary">{item.summary}</p>
      {isOpportunity ? <div className="library-meta"><span>{item.organization_name || 'Organization'}</span>{item.location && <span><MapPin size={15}/>{item.location}</span>}{item.deadline && <span className={isExpired ? 'meta-expired' : ''}><CalendarDays size={15}/>{isExpired ? 'Closed' : `Apply by ${formatDate(item.deadline)}`}</span>}</div>
        : <div className="library-meta">{kind === 'resources' ? <span>{resourceType(item)}</span> : item.author && <span>{item.author}</span>}{date && <span><CalendarDays size={15}/>{formatDate(date)}</span>}</div>}
      {isOpportunity && item.eligibility && <p className="card-eligibility"><strong>Eligibility:</strong> {item.eligibility}</p>}
      <div className="library-card-actions"><Link className="text-link" to={detailPath}>{isOpportunity ? 'View details' : kind === 'resources' ? 'View resource' : 'Read publication'} <ArrowRight size={16}/></Link>
        {!isOpportunity && safeDocumentUrl(item.document_url) && <a className="file-action" href={safeDocumentUrl(item.document_url)} target="_blank" rel="noreferrer"><Download size={15}/> {kind === 'resources' ? 'Open resource' : 'Read / download'}</a>}
        {isOpportunity && !isExpired && !item.is_demo && (safeDocumentUrl(item.application_url)
          ? <a className="button button-primary compact-button" href={safeDocumentUrl(item.application_url)} target="_blank" rel="noreferrer">Apply <ExternalLink size={14}/></a>
          : <Link className="button button-primary compact-button" to={detailPath}>Apply <ArrowRight size={14}/></Link>)}
      </div>
    </div>
  </article>;
}

export function LibraryList({ kind }) {
  const endpoint = `/${kind}`;
  const { records, loading, error } = useRecords(endpoint);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [deadline, setDeadline] = useState('');
  const [sort, setSort] = useState('newest');
  const [limit, setLimit] = useState(9);
  const config = {
    resources: { title: 'Resources', kicker: 'LEARN AND GROW', description: 'Explore practical learning materials, guides and tools for your next step.', noun: 'resources' },
    publications: { title: 'Publications', kicker: 'KNOWLEDGE AND INSIGHT', description: 'Read research, reports, policy insights and stories published by AfriYouth and its partners.', noun: 'publications' },
    opportunities: { title: 'Opportunities', kicker: 'YOUR NEXT STEP', description: 'Find verified opportunities published by organizations and approved for young people.', noun: 'opportunities' }
  }[kind];
  const categories = useMemo(() => [...new Set([...(kind === 'resources' ? resourceCategories : kind === 'publications' ? publicationCategories : opportunityCategories), ...records.map(record => record.category).filter(Boolean)])], [kind, records]);
  const locations = useMemo(() => [...new Set(records.map(record => record.location).filter(Boolean))].sort(), [records]);
  const types = useMemo(() => [...new Set([...opportunityTypes, ...records.map(record => record.opportunity_type).filter(Boolean)])].sort(), [records]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const result = records.filter(item => {
      const matchesSearch = !needle || [item.title, item.summary, item.organization_name, item.author, item.publisher_name, item.category, item.opportunity_type, item.description].some(value => String(value || '').toLowerCase().includes(needle));
      const matchesCategoryFilter = matchesCategory(category, item.category);
      const matchesLocation = !location || item.location === location;
      const matchesType = !type || item.opportunity_type === type;
      const isClosed = expired(item);
      const matchesDeadline = !deadline || (deadline === 'open' && !isClosed) || (deadline === 'expired' && isClosed) || (deadline === 'closing' && !isClosed && item.deadline && daysUntil(item.deadline) <= 7);
      return matchesSearch && matchesCategoryFilter && matchesLocation && matchesType && matchesDeadline;
    });
    return result.sort((a, b) => {
      if (kind === 'opportunities' && sort === 'closing') {
        const closedA = expired(a);
        const closedB = expired(b);
        if (closedA !== closedB) return closedA ? 1 : -1;
        const da = a.deadline ? new Date(`${String(a.deadline).slice(0,10)}T00:00:00`).getTime() : Infinity;
        const db = b.deadline ? new Date(`${String(b.deadline).slice(0,10)}T00:00:00`).getTime() : Infinity;
        return da - db;
      }
      const dateA = kind === 'opportunities' ? (a.created_at || a.published_on) : (a.published_on || a.created_at);
      const dateB = kind === 'opportunities' ? (b.created_at || b.published_on) : (b.published_on || b.created_at);
      return new Date(dateB || 0) - new Date(dateA || 0);
    });
  }, [records, search, category, location, type, deadline, sort, kind]);
  const reset = () => { setSearch(''); setCategory(''); setLocation(''); setType(''); setDeadline(''); setSort('newest'); setLimit(9); };
  return <main className="page-wrap library-page">
    <Intro {...config} links={libraryLinks}/>
    <div className="library-controls">
      <SearchField value={search} onChange={setSearch} placeholder={kind === 'opportunities' ? 'Search title or organization' : `Search ${config.noun}`}/>
      <SelectFilter label="Category" value={category} onChange={value => {setCategory(value);setLimit(9);}} options={categories}/>
      {kind === 'opportunities' && <>
        <SelectFilter label="Location" value={location} onChange={setLocation} options={locations}/>
        {types.length > 0 && <SelectFilter label="Type" value={type} onChange={setType} options={types}/>}
        <label className="filter-field"><span>Deadline</span><select value={deadline} onChange={event => setDeadline(event.target.value)}><option value="">Any deadline</option><option value="open">Open only</option><option value="closing">Closing in 7 days</option><option value="expired">Expired</option></select></label>
        <label className="filter-field"><span>Sort by</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest</option><option value="closing">Closing soon</option></select></label>
      </>}
    </div>
    <div className="library-result-line"><span>{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? (kind === 'opportunities' ? 'opportunity' : kind.slice(0,-1)) : config.noun}`}</span>{(search || category || location || type || deadline) && <button className="clear-filters" onClick={reset}>Clear filters</button>}</div>
    <Notice loading={loading} error={error} empty={!filtered.length} emptyTitle={records.length ? 'No results found' : `No ${config.noun} available yet`} emptyCopy={records.length ? 'Adjust your search or filters to see more content.' : 'New materials will appear here when they are published.'}/>
    {!loading && !error && filtered.length > 0 && <><div className="library-grid">{filtered.slice(0, limit).map(item => <ContentCard key={item.id} item={item} kind={kind}/>)}</div>{filtered.length > limit && <button className="button button-outline-dark load-more" onClick={() => setLimit(value => value + 9)}>Load more <ArrowRight size={16}/></button>}</>}
  </main>;
}

function Breadcrumbs({ kind, title }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to={`/${kind}`}>{kind[0].toUpperCase()+kind.slice(1)}</Link><span>/</span><span aria-current="page">{title}</span></nav>;
}

function DocumentAction({ url, label = 'Open original document' }) {
  const href = safeDocumentUrl(url);
  if (!href) return <p className="document-unavailable">The original document has not been added yet.</p>;
  return <a className="button button-primary" href={href} target="_blank" rel="noreferrer">{label} <ExternalLink size={16}/></a>;
}

export function LibraryDetail({ kind }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applyState, setApplyState] = useState('');
  const endpoint = `/${kind}/${id}`;
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setItem(null);
    api.get(endpoint).then(({ data }) => { if (active) setItem(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  const user = JSON.parse(localStorage.getItem('afriyouth_user') || 'null');
  const isOpportunity = kind === 'opportunities';
  const isClosed = item && (expired(item) || item.status === 'closed');
  const canApply = item && !isClosed && !item.is_demo;
  const applicationUrl = item && safeDocumentUrl(item.application_url);
  const submitApplication = async event => {
    event.preventDefault(); setApplyState('Submitting…');
    try { const { data } = await api.post(`/opportunities/${id}/apply`, { message: applicationMessage }); setApplyState(data.message || 'Application submitted.'); }
    catch (requestError) { setApplyState(requestError.response?.data?.message || 'We could not submit your application. Please sign in and try again.'); }
  };
  return <main className="page-wrap library-detail-page">
    {loading ? <div className="library-state" role="status">Loading details…</div> : error || !item ? <><Breadcrumbs kind={kind} title="Unavailable"/><div className="library-state"><h1>{error ? 'This content is unavailable' : 'Content not found'}</h1><p>The item may have been removed or is not available. Return to the listing to browse current content.</p><Link className="text-link" to={`/${kind}`}><ArrowLeft size={16}/> Back to {kind}</Link></div></> : <>
      <Breadcrumbs kind={kind} title={item.title}/>
      <article className="detail-layout"><div className="detail-copy"><span className="eyebrow blue-text">{item.category || kind}{item.is_demo ? ' · DEMO CONTENT' : ''}</span><h1>{item.title}</h1><p className="detail-summary">{item.summary}</p>
        <div className="detail-meta">{isOpportunity ? <><span>{item.organization_name}</span>{item.location && <span><MapPin size={16}/>{item.location}</span>}{item.deadline && <span><CalendarDays size={16}/>{isClosed ? 'Deadline passed' : `Deadline ${formatDate(item.deadline)}`}</span>}</> : <>{(item.author || item.resource_type) && <span>{item.author || item.resource_type}</span>}{(item.published_on || item.created_at) && <span><CalendarDays size={16}/>{formatDate(item.published_on || item.created_at)}</span>}</>}</div>
        <div className="detail-description">{item.description ? item.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>{item.summary}</p>}{item.eligibility && <section><h2>Eligibility</h2><p>{item.eligibility}</p></section>}{isOpportunity && (item.application_instructions || applicationUrl) && <section><h2>How to apply</h2><p>{item.application_instructions || `Use the application link provided by ${item.organization_name || 'the publishing organization'} and follow its instructions.`}</p></section>}</div>
        {isOpportunity ? <div className="detail-actions">{applicationUrl && canApply && <a className="button button-primary" href={applicationUrl} target="_blank" rel="noreferrer">Apply on organization site <ExternalLink size={16}/></a>}{user?.role === 'youth' && canApply ? <form className="internal-apply form-card" onSubmit={submitApplication}><h2>Apply through AfriYouth</h2><label>Message to the organization<textarea rows="4" value={applicationMessage} onChange={event => setApplicationMessage(event.target.value)} placeholder="Optional"/></label><button className="button button-primary" type="submit" disabled={applyState === 'Submitting…' || applyState === 'Application submitted.'}>Submit application <ArrowRight size={16}/></button>{applyState && <p role="status">{applyState}</p>}</form> : !user && canApply ? <Link className="button button-outline-dark" to="/login">Sign in to apply through AfriYouth <ArrowRight size={16}/></Link> : null}{isClosed && <p className="expired-notice">This opportunity has expired and is no longer accepting applications.</p>}{item.is_demo && <p className="expired-notice">This is demonstration content. Applications are not open.</p>}{!applicationUrl && canApply && user?.role !== 'youth' && <p className="document-unavailable">Contact the publishing organization for application instructions.</p>}</div> : <DocumentAction url={item.document_url} label={kind === 'resources' ? 'View or download resource' : 'Read or download publication'}/>}
        <Link className="back-link" to={`/${kind}`}><ArrowLeft size={16}/> Back to {kind}</Link>
      </div><img className="detail-image" src={imageFor(item.category, item.title)} alt={`${item.title}: ${item.category || 'AfriYouth'} content`}/></article>
    </>}
  </main>;
}
