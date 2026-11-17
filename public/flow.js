export const stages = ['Your dog','The groom','Care needs','What-ifs','Review'];
const t=(id,label,hint='',extra={})=>({type:'text',id,label,hint,...extra});
const note=(id,label,hint='')=>({...t(id,label,hint),type:'note'});
const pick=(id,label,options,required=false)=>({type:'radio',id,label,options,required});
const chips=(id,label,options,max)=>({type:'chips',id,label,options,max});
const photo=(id,label)=>({type:'photo',id,label});
const s=(id,stage,title,intro,ref,fields=[],extra={})=>({id,stage,title,intro,ref,fields,...extra});
export const flow=[
s('roles',0,'A good groom starts here.','Pick your side of the conversation.','New · role selection'),
s('welcome',0,'A little prep. A happier groom.','Choose how you’d like to plan this visit.','01',[],{art:'dog'}),
s('dog',1,'First, meet your pup.','Who’s coming in for a groom?','02',[
 t('name','Dog’s name','e.g. Milo',{required:true,maxLength:60}),t('breed','Breed or mix','e.g. Goldendoodle, mixed breed, or not sure'),t('age','Age','e.g. 3 years'),t('weight','Weight, with unit','e.g. 28 lb'),t('salon','Grooming business','Salon or mobile business'),t('groomer','Individual groomer','Name of the person grooming your dog'),t('visit','Visit date','',{type:'date'}),t('birthday','Birthday','',{type:'date'}),t('groomerAddress','Groomer address','',{maxLength:300}),t('groomerEmail','Groomer email','',{type:'email',maxLength:254}),t('groomerPhone','Groomer phone','',{type:'tel',maxLength:40})]),
s('current-photos',1,'Your pup, as they are today.','Show the coat your groomer will see at drop-off. All photos are optional.','03',[photo('currentFace','Face today'),photo('currentSide','Side today'),photo('currentBack','Back today')],{badge:'Current coat'}),
s('service',2,'What’s the plan?','Pick a service and what matters most to you.','04',[
pick('service','Service',['Bath + haircut','Bath + tidy','Bath only','Discuss with my groomer'],true),chips('priorities','What matters most? Choose up to two.',['Easy upkeep','Keep some fluff','Match my photo','Comfort first'],2),note('priorityNote','My top priority')]),
s('inspiration',2,'Show the groom you mean.','A past groom or inspiration photo can say more than “just a trim.”','05–06',[photo('reference','Desired groom'),t('source','Where is this look from?','e.g. My dog’s last groom'),note('likesPhoto','What do you like about it?','e.g. The rounded face, but not the short ears'),photo('referenceTwo','Second desired look')],{cut:true,badge:'Desired look'}),
s('finish',2,'A little this. A little that.','Describe the finish you have in mind. Your groomer will check what’s possible.','07',[
{type:'range',id:'finish',label:'Overall finish',options:['Short & tidy','A little shorter','Balanced','Some extra fluff','Long & fluffy']},pick('style','Styling priority',['Simple & practical','More detail, if comfortable','Discuss together'])],{cut:true}),
s('face',2,'That familiar face.','Pick the details you care about. Leave the rest for the conversation.','08',[
pick('head','Head shape',['Rounded','Natural','Discuss']),pick('beard','Beard or muzzle',['Short & tidy','Fuller','Discuss']),pick('fringe','Fringe',['Clear of eyes','Keep longer','Discuss']),note('faceNotes','Face notes')],{cut:true}),
s('body',2,'Body, legs & little details.','A length is a request for your groomer to confirm after checking the coat.','09',[
pick('body','Body length',['Shorter','Medium','Longer','Discuss']),t('length','Requested remaining length','e.g. About half an inch'),pick('legs','Legs',['Match body','Slightly fuller','Discuss']),pick('paws','Paws',['Tidy outline','Keep natural','Discuss']),note('bodyNotes','Body notes')],{cut:true}),
s('ears-tail',2,'Keep the good fluff.','Your preferred look doesn’t give permission for a shorter cut if there are mats.','10',[
pick('ears','Ears',['Keep long, tidy edges','Shorter','Discuss']),pick('tail','Tail',['Fluffy, trim the tip','Shorter','Discuss']),note('earNotes','Ear and tail notes')],{cut:true}),
s('coat',3,'How’s the coat today?','Share what you’ve noticed. Your groomer will check the coat in person.','11',[
pick('coat','Coat condition',['No tangles noticed','Some tangles','Tight or widespread mats','Not sure'],true),t('lastGroom','Last professional groom','e.g. About 7 weeks ago'),t('brushing','Brushing at home','e.g. Twice a week'),note('coatNotes','Coat notes')]),
s('spots',3,'Show the sensitive spots.','Tap the spot on the guide dog. Tell your groomer what to look out for.','12–13',[
t('spotArea','Where is it?','e.g. Behind the left ear'),photo('spotPhoto','Current coat close-up'),pick('sensitive','Does the area seem sensitive?',['Yes','No','Not sure']),note('spotNotes','What have you noticed?')],{spot:true}),
s('handling',3,'How does grooming feel?','Choose what sounds like your pup.','14–15',[
pick('anxiety','Usually during grooming',['Relaxed','A little nervous','Very nervous','Not sure']),chips('helps','What helps?',['Slow greeting','Quiet space','Treats','Familiar voice']),chips('triggers','What bothers your pup?',['Loud dryer','Paw handling','Face handling','Other dogs']),note('handlingNotes','Past experiences or other tips')]),
s('health',3,'What keeps your pup comfortable?','Share care information that matters for this visit. “None known” and “Not sure” are useful answers.','16',[
t('allergies','Allergies or product sensitivities'),t('meds','Medications or relevant conditions'),t('mobility','Mobility or standing concerns'),note('comfortNotes','Anything else for their comfort?')]),
s('what-ifs',4,'Care comes first.','Set your what-ifs before the visit.','17',[],{art:'plan'}),
s('mats',4,'If the coat needs a change.','Your preferred haircut and your instructions for mats are separate.','18',[
pick('mats','If a shorter cut is needed for mats…',['Contact me before changing the cut','Leave the area and discuss at pickup','Stop and discuss options'],true)]),
s('time',4,'A little more time?','An extra-time allowance does not approve extra fees or a shorter cut.','19',[
pick('time','If more working time is needed…',['Ask me first','Up to 15 extra minutes','Up to 30 extra minutes'],true)]),
s('fees',4,'No surprise extras.','This is your limit, not a quote. It doesn’t approve a different cut or extra time.','20',[
pick('fees','If there’s an extra fee…',['Ask before any added fee','Up to $15 extra','Up to $30 extra'],true)]),
s('distress',4,'If it gets too much.','Your groomer can always stop unsafe work. A preference never requires continuing through distress.','21',[
pick('distress','If your dog becomes distressed…',['Pause and contact me','Offer a calm break; stop if distress continues','Stop and arrange pickup'],true)]),
s('contact',4,'Let’s keep in touch.','Contact details are optional. Choose whether to include them in your finished plan.','22',[
t('owner','Your name'),t('phone','Phone number','',{type:'tel'}),t('email','Email address','',{type:'email'}),t('secondaryOwner','Secondary contact name','',{maxLength:100}),t('secondaryPhone','Secondary contact phone','',{type:'tel',maxLength:40}),pick('channel','Preferred contact method',['Call','Text','Email']),{type:'check',id:'includeContact',label:'Include these contact details in the groomer’s copy'}]),
s('unreachable',4,'If we miss each other.','No reply is not permission. New changes still need the appropriate approval.','23',[
pick('unreachable','If you can’t be reached…',['Pause work needing new permission','Complete only work already agreed','Stop and arrange collection'],true)]),
s('review-look',5,'Here’s the look.','Check the visit, photos and style requests. You can still change any detail.','24'),
s('review-care',5,'All on the same page.','Check your care notes and limits before finishing your request.','25',[
{type:'check',id:'checked',label:'I’ve checked my choices for this visit.',required:true},{type:'check',id:'understood',label:'I understand my groomer still needs to review the plan.',required:true}]),
s('ready',0,'Your groom plan is ready.','Bring a copy to your groomer. Your request is saved in this tab and has not been sent or agreed.','26'),
s('sheet',0,'Groom Blueprint','The owner’s request for this visit. Review it together before starting.','31'),
s('groomer-view',0,'Groomer’s copy.','See the plan prepared in this tab, with the owner’s care notes and limits.','New · local groomer handoff')];

export const byId = Object.fromEntries(flow.map(page => [page.id, page]));
export const decisionIds = ['mats', 'time', 'fees', 'distress', 'unreachable'];
export const careMap = 'sensitiveMap';
export const guides = {
  doodle: { label: 'Doodle', image: 'assets/guide-doodle.jpg' },
  terrier: { label: 'Terrier', image: 'assets/guide-terrier.jpg' },
  spaniel: { label: 'Spaniel', image: 'assets/guide-spaniel.jpg' }
};
export const advanced = answers => answers.mode !== 'basic';

export function intake(answers) {
  return flow.filter(page => {
    if (!page.stage) return false;
    if (page.cut) return advanced(answers) && answers.service !== 'Bath only';
    if (page.id === 'current-photos') return advanced(answers);
    return true;
  });
}

export function journey(answers) {
  return intake(answers).filter(page =>
    !decisionIds.includes(page.id) && !['spots', 'health'].includes(page.id)
  );
}

export function fieldsFor(page, answers) {
  if (page.id === 'spots') {
    // Keep original, owner-entered area notes available when opening an older draft.
    if (!['Some tangles','Tight or widespread mats'].includes(answers.coat)) return [];
    return page.fields.filter(field => answers[field.id] && (advanced(answers) || field.type !== 'photo'));
  }
  if (page.id === 'service' && !advanced(answers)) {
    return page.fields.map(field => field.id === 'priorities'
      ? {...field, options: field.options.filter(value => value !== 'Match my photo')}
      : field);
  }
  return page.fields;
}

export function incomplete(page, answers) {
  return fieldsFor(page, answers).find(field => {
    const value = answers[field.id];
    if (field.type === 'email' && value) return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!field.required) return false;
    return typeof value === 'string' ? !value.trim() : !value;
  });
}

export function snapshot(answers, now = new Date()) {
  const data = {mode: advanced(answers) ? 'advanced' : 'basic'};
  if(typeof answers.groomerId==='string' && answers.groomerId)data.groomerId=answers.groomerId;
  const photos = new Set();
  for (const page of intake(answers).filter(p => p.stage < 5)) {
    if (page.id === 'contact' && !answers.includeContact) continue;
    for (const field of fieldsFor(page, answers)) {
      let value = answers[field.id];
      if (field.id === 'priorities' && Array.isArray(value)) value = value.filter(item => field.options.includes(item));
      if (value === undefined || value === '' || value === false) continue;
      data[field.id] = structuredClone(value);
      if (field.type === 'photo') photos.add(field.id);
    }
  }
  data.guide = guides[answers.guide] ? answers.guide : 'doodle';
  data.pins = {};
  for (const [key, pins] of Object.entries(answers.pins || {})) {
    if ((key === careMap || photos.has(key)) && Array.isArray(pins) && pins.length) {
      data.pins[key] = structuredClone(pins);
    }
  }
  return {status: 'Owner request · not agreed', date: now.toISOString(), data};
}

