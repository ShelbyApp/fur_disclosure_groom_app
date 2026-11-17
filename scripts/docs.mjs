import {mkdir,writeFile} from 'node:fs/promises';
import {flow,stages,decisionIds,journey} from '../public/flow.js';
const dir='docs/screens';await mkdir(dir,{recursive:true});
const behaviour={
'roles':"Both role cards use the same phone-width canvas. Dog owner opens the account entry. Groomer reads the finished local copy.",
'welcome':"Choose Basic or Advanced before entering dog details. Basic covers the service, care and contingencies. Advanced also offers uploads, styling and notes placed on photos. Switching modes keeps shared answers. A different visit requires an explicit reset.",
dog:'A signed-in visit uses the selected dog’s saved identity. The owner can edit it for this visit. Guests enter their own dog. A dog name is required. Salon, individual groomer and visit date are independent optional values. A date is an owner-entered detail, not a booking.',
'current-photos':"Advanced only. Face, side and back are optional independent photo slots. Tap a photo to add a numbered note. Enlarge, edit notes, replace or remove the photo. Replacing a marked photo clears its notes after confirmation.",
'service':"Service and planning mode are independent. Both can request a haircut. Pick one service and up to two priorities. Basic continues to coat and omits the photo priority. Advanced bath-only also skips the haircut chapter.",
'inspiration':"Advanced haircut or tidy visits can include two independent reference photos, an optional source and an overall note. Tap the actual photo to add numbered placement notes. Each pin has an optional area and required owner text. Changing or removing one photo leaves the other intact.",
finish:'A five-position slider and named tap choices control the same value. No value is saved until a choice is made. It is not an exact remaining length.',
face:'Each of head, muzzle and fringe can be answered independently. No preference implies permission for a shorter cut for matting.',
body:'Capture body, legs and paws separately. Free text can describe a remaining length for the groomer to confirm.',
'ears-tail':'Ear and tail requests are independent. The optional note goes into the exact owner request.',
'coat':"Both modes ask about coat condition. History and notes expand on request. Open the guide map for tender spots with any coat answer.",
'spots':"Choose a doodle, terrier or spaniel guide and tap any location. Add an area and a note, edit or delete existing notes, or add a text-only area. Arrow keys position the keyboard pointer. The guide stays fixed while it has notes. Both modes show sensitive spots in review, the groomer copy and print. Older flagged coat detail remains readable.",
'handling':"Choose the pup’s nervous level, what helps and what bothers them. Open optional handling notes, health details or a sensitive spot. Both modes use the same care controls.",
'health':"Optional detail screen opened from handling or care review. Capture allergies, relevant conditions and mobility. Save returns to the originating screen.",
'what-ifs':"Five expandable rows show separate choices for matting, time, fees, distress and missed contact. Tap a choice to save and fold the row. Continue opens the first unfinished row. The guide map remains available here in both modes.",
mats:'Explicit choice required. A shorter cut always requires discussion under these options. No automatic shaving, diagnosis or dematting procedure is offered.',
time:'An explicit time choice is required; selecting minutes grants no permission for fees or a style change.',
fees:'Choose one limit explicitly. Examples are owner allowances, not salon quotes or payments. No time or cut permission is inferred.',
distress:'Choose how to handle distress, with the groomer free to stop unsafe work whatever the response.',
contact:'Owner name, sign-in email and saved phone fill in the contact screen. Visit edits do not change the profile. Guests can enter contact details here. An unchecked inclusion choice removes all contact fields, including the preferred channel, from the finished sheet. An entered email is validated.',
unreachable:'A missed call does not authorize new work. An explicit preference is required.',
'review-look':"Compact rows show the first answer. Expand any row to review or edit. Included photos show the numbered markers and their notes. Basic review excludes styling, photos and photo notes, including after a mode change.",
'review-care':"Expand the care, sensitive-spot and decision rows. Edit returns to the originating input. Finishing requires both visit-specific acknowledgements and creates a local snapshot.",
ready:'Shows the finished owner request with access to the printable sheet and groomer copy. A signed-in visit enters the dog’s history before this page opens. Never claims a delivery, booking or agreement.',
'sheet':"The finished request includes numbered guide and photo notes beside the corresponding image. Browser print or PDF includes each visible section. Basic snapshots omit advanced photos and styling. Edit returns to review.",
'groomer-view':'With no finished plan, show an empty state and link to owner intake. With one, display the same filtered snapshot as the printable sheet. No queue, network lookup, change approval, account or access to another browser’s data.'
};
const files=Object.fromEntries(flow.map((s,i)=>[s.id,String(i+1).padStart(2,'0')+'-'+s.id+'.md']));
const link=id=>'['+id+']('+files[id]+')';
const index=flow.map(s=>'- '+link(s.id)+' — '+s.title).join('\n');
await writeFile(dir+'/README.md','# Screen specifications · Groom Planner\n\nMobile redesign. Every implemented route has its own specification. Stage numbers represent chapters, not individual questions. Regenerate with npm run docs after changing the screen definitions or the behavior notes in scripts/docs.mjs.\n\n'+index+'\n');
for(const [i,s] of flow.entries()){
 const list=(s.id==='spots'?[]:s.fields).map(f=>'- **'+f.label+'** — '+f.type+(f.required?' · required':' · optional')+(f.options?': '+f.options.join(' / '):'')+(f.max?' (maximum '+f.max+')':'')).join('\n');
 const navs=[];
 for(const mode of ['basic','advanced']){
   const path=journey({mode,service:'Bath + haircut'});
   const index=path.indexOf(s);
   if(index>=0) navs.push(mode+' haircut path: '+link(index?path[index-1].id:'welcome')+' → '+link(s.id)+' → '+link(path[index+1]?.id || 'ready')+'.');
 }
 if(decisionIds.includes(s.id)) navs.push('Selectable in '+link('what-ifs')+' or individually from review. Save returns to the originating screen.');
 if(s.id==='spots') navs.push('Open from coat, handling, what-ifs or care review. Save returns to the origin.');
 if(s.id==='health') navs.push('Open from handling or care review. Save returns to the origin.');
 if(s.cut) navs.push('Advanced only. Bath-only skips this chapter. Remaining look details can be skipped.');
 const navigation = {roles:'Owner opens the account entry. Groomer opens the current tab’s reader.',welcome:'Both new modes lead to dog details. Resume restores the current visit.',ready:'Open the printable blueprint or the groomer copy.',sheet:'Print or return to review for edits. Return to the household or guest account entry.', 'groomer-view':'An empty reader links to the owner flow. A finished copy can be printed.'};
 const nav=navs.join(' ') || navigation[s.id];
 const specialInputs = {
   roles:'Two role buttons: Dog owner and Groomer.',
   welcome:'Basic groom and Advanced groom cards. An existing visit also shows resume or view, and an action to start a different visit.',
   spots:'Guide body shape; optional point on the image; optional area name; required note text for each saved pin. Edit and delete are available for every pin.',
   'what-ifs':'Five expandable rows, each with a separate required choice. A sensitive-spot card opens the guide map.',
   'review-look':'Expandable visit, service, photo and styling rows with edit links.',
   ready:'Finished request, printable blueprint and groomer view buttons.',
   sheet:'Dated, read-only visit snapshot and print action.',
   'groomer-view':'Read-only snapshot or an empty state when the owner has not finished.'
 };
 const inputText = specialInputs[s.id] || list || 'Review the displayed visit details.';
 const spec='# '+s.title+'\n\n**Route:** `#/'+s.id+'` · **Stage:** '+(stages[s.stage-1]||'Role / visit handoff')+' · **Design reference:** '+s.ref+'\n\n## Purpose\n\n'+s.intro+'\n\n## Inputs and displayed content\n\n'+inputText+'\n\n## Navigation\n\n'+nav+'\n\n## Behavior and acceptance\n\n'+behaviour[s.id]+'\n\n'+(s.id!=='spots' && s.fields.some(f=>f.type==='photo')?'Photo controls accept JPEG, PNG and WebP up to 12 MB. Resize locally, keep a thumbnail and report a readable error without losing the draft.\n\n':'')+'[All screens](README.md) · [Brand and interaction guide](../BRAND.md)\n';
 await writeFile(dir+'/'+files[s.id],spec);
}
const ownerScreens=[
 ['account','Owner sign-in','Request an email sign-in link for a new or returning Supabase user. A successful sign-in leads to the household or first-time owner form. Show the destination email after a request. Guests may plan a single visit in their browser tab.'],
 ['profile','Household profile','Show the saved owner and all their dogs. Each dog opens its own profile. Add dog, edit owner information or sign out. Signing out clears account-bound drafts on this tab.'],
 ['owner-settings','Owner details','Show the account email and save the owner name and optional phone. On first save, open the first dog form. Later edits return to the household.'],
 ['dog-profile','Dog profile','Show birthday, breed, usual preferences, a new visit action, any resumable draft in this tab, and history for this dog. Starting from this screen uses the current dog identity and defaults.'],
 ['edit-dog','Dog identity and defaults','Add or edit one dog. Name is required. Breed, birthday and weight are optional. Set nervous level and independent defaults for matting, extra time, fees, distress and missed contact. Empty values are chosen per visit. Profile edits apply to future plans.'],
 ['history','Dog groom history','Show finished records for this dog, newest saved first. Display scheduled visit date when provided, otherwise the save date. Open a record or start a new groom. Paginate ten records at a time.'],
 ['past-groom','Previous groom','Read or print the dated plan with its photos and numbered notes. Copy into a new draft to change individual sections. Keep previous styling, care choices and annotations; renew the date, contact inclusion and acknowledgements. Finishing appends a separate history record.']
];
const profileIndex=[];
for(const [index,[route,title,description]] of ownerScreens.entries()){
  const file=String(flow.length+index+1).padStart(2,'0')+'-'+route+'.md';
  await writeFile(dir+'/'+file,'# '+title+'\n\n**Route** `#/'+route+'`'+(route==='history'||route==='dog-profile'?' with dog ID':route==='past-groom'?' with dog and groom IDs':route==='edit-dog'?' with a dog ID or new':'')+'\n\n'+description+'\n\n[Screen index](README.md) · [Account setup](../SUPABASE.md)\n');
  profileIndex.push('- ['+title+']('+file+')');
}
await writeFile(dir+'/README.md','# Screen specifications · Groom Planner\n\n## Profile and history\n\n'+profileIndex.join('\n')+'\n\n## Visit planning\n\n'+index+'\n');
