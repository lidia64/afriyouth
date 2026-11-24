import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
const asyncRoute = handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);
const clean = value => typeof value === 'string' ? value.trim() : '';
const list = value => String(value || '').split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean).slice(0,80);
const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const containsPhrase = (text, phrase) => {
  const haystack = ` ${normalise(text)} `;
  const needle = normalise(phrase);
  return Boolean(needle && haystack.includes(` ${needle} `));
};
const splitRequirements = value => String(value || '').split(/[\n;•]+/).map(item=>item.replace(/^[-*\d.)\s]+/,'').trim()).filter(Boolean).slice(0,30);
const skillWords = value => [...new Set(normalise(value).split(' ').filter(word=>word.length>3 && !['with','from','that','this','have','your','will','must','work','good','strong','experience','skills','skill','able','ability','years','year','knowledge','required','preferred','applicants'].includes(word)))];
const profileFields = ['education','skills','interests','career_goals','country','city'];
const completion = profile => Math.round(profileFields.filter(field=>clean(profile[field])).length / profileFields.length * 100);
const opportunitySelect = `
  SELECT o.id,o.title,c.category_name AS category,o.opportunity_type,
    COALESCE(o.short_description,o.description) AS summary,o.description,o.requirements,o.eligibility,
    o.location,o.closing_date AS deadline,o.application_url,o.application_instructions,
    COALESCE(NULLIF(org.organization_name,''),NULLIF(o.publisher_name,'')) AS organization_name,o.is_demo,o.status,o.published_at,
    (SELECT COUNT(*) FROM applications application_count WHERE application_count.opportunity_id=o.id) AS application_count
  FROM opportunities o LEFT JOIN categories c ON c.id=o.category_id
  LEFT JOIN user_profiles owner_profile ON owner_profile.user_id=o.created_by
  LEFT JOIN organizations org ON org.id=owner_profile.organization_id`;

async function profileFor(userId) {
  let [rows]=await pool.execute('SELECT * FROM user_profiles WHERE user_id=?',[userId]);
  if(!rows[0]) {
    await pool.execute('INSERT IGNORE INTO user_profiles (user_id) VALUES (?)',[userId]);
    [rows]=await pool.execute('SELECT * FROM user_profiles WHERE user_id=?',[userId]);
  }
  return rows[0];
}
async function organizationIdFor(userId) {
  const [[row]]=await pool.execute('SELECT organization_id FROM user_profiles WHERE user_id=?',[userId]);
  return row?.organization_id || null;
}
function profileSignals(profile, opportunity) {
  const body=[opportunity.category,opportunity.title,opportunity.summary,opportunity.description,opportunity.requirements,opportunity.eligibility].filter(Boolean).join(' ');
  const context=[opportunity.category,opportunity.title,opportunity.summary].filter(Boolean).join(' ');
  const matchedSkills=list(profile.skills).filter(skill=>containsPhrase(body,skill));
  const matchedInterests=list(profile.interests).filter(interest=>containsPhrase(context,interest));
  const matchedEducation=clean(profile.education) && containsPhrase(`${opportunity.requirements || ''} ${opportunity.eligibility || ''}`,profile.education);
  const places=[profile.city,profile.country].filter(Boolean);
  const locationMatch=places.some(place=>containsPhrase(opportunity.location,place));
  const remoteMatch=/remote|online|virtual|hybrid/i.test(opportunity.location || '') && Boolean(profile.city || profile.country);
  const reasons=[];
  if(matchedSkills.length) reasons.push(`Your listed skill${matchedSkills.length===1?'':'s'} match the opportunity text: ${matchedSkills.join(', ')}.`);
  if(matchedInterests.length) reasons.push(`The opportunity topic overlaps your stated interest${matchedInterests.length===1?'':'s'}: ${matchedInterests.join(', ')}.`);
  if(matchedEducation) reasons.push('Your education entry appears in the stated eligibility or requirements.');
  if(locationMatch || remoteMatch) reasons.push(locationMatch ? `The listed location includes ${profile.city || profile.country}.` : 'The listing is remote, online, virtual, or hybrid.');
  const providedSkills=list(profile.skills).map(normalise);
  const requirementsNotInProfile=splitRequirements(opportunity.requirements).filter(requirement=>!providedSkills.some(skill=>containsPhrase(requirement,skill)));
  return {matchedSkills,matchedInterests,matchedEducation:Boolean(matchedEducation),locationMatch:locationMatch || remoteMatch,reasons,requirementsNotInProfile,hasMatch:reasons.length>0,rank:matchedSkills.length*3+matchedInterests.length*2+Number(Boolean(matchedEducation))+Number(locationMatch || remoteMatch)};
}
function resourceRecommendations(resources, programs, gaps) {
  const candidates=[...resources.map(item=>({...item,kind:'resource'})),...programs.map(item=>({...item,kind:'program'}))];
  return gaps.map(gap=>{
    const words=skillWords(gap);
    const matches=candidates.map(item=>{
      const text=normalise([item.title,item.category,item.summary,item.description].filter(Boolean).join(' '));
      const overlap=words.filter(word=>text.includes(word)).length;
      return {...item,overlap};
    }).filter(item=>item.overlap>0).sort((a,b)=>b.overlap-a.overlap).slice(0,2);
    return {gap,matches};
  }).filter(entry=>entry.matches.length>0).slice(0,8);
}

router.get('/youth',requireAuth,allowRoles('youth'),asyncRoute(async(req,res)=>{
  const profile=await profileFor(req.user.id);
  const [opportunities]=await pool.execute(`${opportunitySelect}
    WHERE o.status='published' AND o.is_demo=0 AND (o.closing_date IS NULL OR o.closing_date>=CURRENT_DATE)
    ORDER BY o.published_at DESC,o.id DESC`);
  const [resources]=await pool.execute(`SELECT r.id,r.title,c.category_name AS category,COALESCE(r.short_description,r.description) AS summary,r.description
    FROM resources r LEFT JOIN categories c ON c.id=r.category_id WHERE r.status='published' AND r.is_demo=0 ORDER BY r.published_at DESC,r.id DESC`);
  const [programs]=await pool.execute(`SELECT p.id,p.title,c.category_name AS category,COALESCE(p.objectives,p.description) AS summary,p.description
    FROM programs p LEFT JOIN categories c ON c.id=p.category_id WHERE p.status='published' AND p.is_demo=0 ORDER BY p.start_date DESC,p.id DESC`);
  const [saved]=await pool.execute(`SELECT o.id,o.title,c.category_name AS category,o.location,o.closing_date AS deadline,o.is_demo
    FROM saved_opportunities s JOIN opportunities o ON o.id=s.opportunity_id LEFT JOIN categories c ON c.id=o.category_id
    WHERE s.user_id=? ORDER BY s.saved_at DESC`,[req.user.id]);
  const [applications]=await pool.execute(`SELECT a.id,a.application_status AS status,a.submitted_at,o.id AS opportunity_id,o.title,o.closing_date AS deadline,
    o.application_url,o.application_instructions,COALESCE(NULLIF(org.organization_name,''),NULLIF(o.publisher_name,'')) AS organization_name
    FROM applications a JOIN opportunities o ON o.id=a.opportunity_id
    LEFT JOIN user_profiles up ON up.user_id=o.created_by LEFT JOIN organizations org ON org.id=up.organization_id
    WHERE a.user_id=? AND o.is_demo=0 ORDER BY a.submitted_at DESC`,[req.user.id]);
  const matches=opportunities.map(opportunity=>({...opportunity,...profileSignals(profile,opportunity)}))
    .sort((a,b)=>b.rank-a.rank || new Date(b.published_at || 0)-new Date(a.published_at || 0));
  const allGaps=[...new Set(matches.flatMap(item=>item.requirementsNotInProfile))];
  res.json({profile,profileCompletion:completion(profile),matches,saved,applications,
    pathways:resourceRecommendations(resources,programs,allGaps)});
}));

router.put('/profile',requireAuth,allowRoles('youth'),asyncRoute(async(req,res)=>{
  const limits={education:300,skills:2500,interests:2500,career_goals:1500,country:100,city:100};
  const values={};
  for(const [field,max] of Object.entries(limits)) {
    if(req.body[field]!==undefined && req.body[field]!==null && typeof req.body[field]!=='string') return res.status(400).json({message:`${field.replaceAll('_',' ')} must be text.`});
    const value=clean(req.body[field]);
    if(value.length>max) return res.status(400).json({message:`${field.replaceAll('_',' ')} is too long.`});
    values[field]=value || null;
  }
  const profile=await profileFor(req.user.id);
  await pool.execute(`UPDATE user_profiles SET education=?,skills=?,interests=?,career_goals=?,country=?,city=? WHERE user_id=?`,
    [values.education,values.skills,values.interests,values.career_goals,values.country,values.city,req.user.id]);
  const updated=await profileFor(req.user.id);
  res.json({profile:updated,profileCompletion:completion(updated)});
}));

router.post('/saved-opportunities/:id',requireAuth,allowRoles('youth'),asyncRoute(async(req,res)=>{
  const [result]=await pool.execute(`INSERT IGNORE INTO saved_opportunities (user_id,opportunity_id)
    SELECT ?,id FROM opportunities WHERE id=? AND status='published' AND is_demo=0`,[req.user.id,req.params.id]);
  if(!result.affectedRows) {
    const [[saved]]=await pool.execute('SELECT 1 AS found FROM saved_opportunities WHERE user_id=? AND opportunity_id=?',[req.user.id,req.params.id]);
    if(!saved) return res.status(404).json({message:'This opportunity is not available to save.'});
  }
  res.status(200).json({message:'Opportunity saved.'});
}));
router.delete('/saved-opportunities/:id',requireAuth,allowRoles('youth'),asyncRoute(async(req,res)=>{
  await pool.execute('DELETE FROM saved_opportunities WHERE user_id=? AND opportunity_id=?',[req.user.id,req.params.id]);
  res.json({message:'Saved opportunity removed.'});
}));

router.get('/organization',requireAuth,allowRoles('partner'),asyncRoute(async(req,res)=>{
  const organizationId=await organizationIdFor(req.user.id);
  const ownership=`(o.created_by=? OR (? IS NOT NULL AND owner_profile.organization_id=?))`;
  const params=[req.user.id,organizationId,organizationId];
  const [opportunities]=await pool.execute(`${opportunitySelect}
    WHERE ${ownership} ORDER BY o.published_at DESC,o.id DESC`,params);
  const [applicationRows]=await pool.execute(`SELECT a.id,a.application_status AS status,a.submitted_at,a.cover_letter,
    o.id AS opportunity_id,o.title,o.closing_date AS deadline,u.full_name AS applicant_name,u.email AS applicant_email
    FROM applications a JOIN opportunities o ON o.id=a.opportunity_id JOIN users u ON u.id=a.user_id
    LEFT JOIN user_profiles owner_profile ON owner_profile.user_id=o.created_by
    WHERE o.is_demo=0 AND (o.created_by=? OR (? IS NOT NULL AND owner_profile.organization_id=?)) ORDER BY a.submitted_at DESC`,params);
  const real=opportunities.filter(item=>!item.is_demo);
  const applicationStats={total:applicationRows.filter(item=>real.some(opp=>opp.id===item.opportunity_id)).length,submitted:0,under_review:0,shortlisted:0,accepted:0,rejected:0};
  for(const app of applicationRows) if(Object.hasOwn(applicationStats,app.status) && real.some(opp=>opp.id===app.opportunity_id)) applicationStats[app.status]++;
  res.json({opportunities,applications:applicationRows,applicationStats,organizationId});
}));

router.patch('/organization/opportunities/:id',requireAuth,allowRoles('partner'),asyncRoute(async(req,res)=>{
  const status=req.body.status;
  if(!['closed','archived'].includes(status)) return res.status(400).json({message:'Organizations may close or archive their own opportunities. Publication requires admin approval.'});
  const organizationId=await organizationIdFor(req.user.id);
  const [result]=await pool.execute(`UPDATE opportunities o LEFT JOIN user_profiles owner_profile ON owner_profile.user_id=o.created_by
    SET o.status=? WHERE o.id=? AND (o.created_by=? OR (? IS NOT NULL AND owner_profile.organization_id=?))`,
    [status,req.params.id,req.user.id,organizationId,organizationId]);
  if(!result.affectedRows) return res.status(404).json({message:'Opportunity not found or not managed by your organization.'});
  res.json({message:`Opportunity ${status}.`});
}));

router.patch('/organization/applications/:id',requireAuth,allowRoles('partner'),asyncRoute(async(req,res)=>{
  const status=req.body.status;
  if(!['under_review','shortlisted','accepted','rejected'].includes(status)) return res.status(400).json({message:'Choose a valid application review status.'});
  const organizationId=await organizationIdFor(req.user.id);
  const [result]=await pool.execute(`UPDATE applications a JOIN opportunities o ON o.id=a.opportunity_id
    LEFT JOIN user_profiles owner_profile ON owner_profile.user_id=o.created_by
    SET a.application_status=?,a.reviewed_by=?,a.reviewed_at=NOW()
    WHERE a.id=? AND (o.created_by=? OR (? IS NOT NULL AND owner_profile.organization_id=?))`,
    [status,req.user.id,req.params.id,req.user.id,organizationId,organizationId]);
  if(!result.affectedRows) return res.status(404).json({message:'Application not found or not accessible to your organization.'});
  res.json({message:'Application status updated.'});
}));

router.get('/admin',requireAuth,allowRoles('admin'),asyncRoute(async(_req,res)=>{
  const [[youth]]=await pool.execute(`SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id=u.role_id WHERE r.role_name='youth' AND u.account_status='active'`);
  const [[approved]]=await pool.execute("SELECT COUNT(*) AS total FROM opportunities WHERE status='published' AND is_demo=0");
  const [[applications]]=await pool.execute("SELECT COUNT(*) AS total FROM applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE o.is_demo=0");
  const [[organizations]]=await pool.execute("SELECT COUNT(DISTINCT org.id) AS total FROM partners p JOIN organizations org ON org.id=p.organization_id WHERE p.status='active' AND org.is_demo=0 AND org.is_verified=1");
  const [pending]=await pool.execute(`${opportunitySelect} WHERE o.status='pending' AND o.is_demo=0 ORDER BY o.id DESC`);
  res.json({impact:{registeredYouth:youth.total,approvedOpportunities:approved.total,applications:applications.total,participatingOrganizations:organizations.total},pendingOpportunities:pending});
}));

export default router;
