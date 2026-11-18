// Local contract fixture for the browser test. No email or request leaves localhost.
export function installAuthFixture(directory=[]) {
  const config={url:location.origin,publishableKey:'sb_publishable_local_fixture'};
  Object.defineProperty(window,'FD_CONFIG',{get:()=>config,set:()=>{}});
  const send=window.fetch.bind(window);
  const owner='11111111-1111-4111-8111-111111111111';
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url||input,location.href);
    if(url.origin!==location.origin)throw Error('External request is outside this fixture.');
    const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
    if(url.pathname==='/auth/v1/recover'){
      const data=JSON.parse(options.body);
      sessionStorage.setItem('test:mail',JSON.stringify({email:data.email,redirect:url.searchParams.get('redirect_to')}));
      return reply({});
    }
    const user={id:owner,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
    if(url.pathname==='/auth/v1/signup'){
      if(JSON.parse(options.body).password!=='fixture password one')return reply({msg:'Password required'},400);
      return reply(user);
    }
    if(url.pathname==='/auth/v1/token' && url.searchParams.get('grant_type')==='password'){
      const expected=sessionStorage.getItem('test:password-changed')==='yes'?'fixture password two':'fixture password one';
      if(JSON.parse(options.body).password!==expected)return reply({msg:'Invalid login credentials'},400);
      const encode=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({exp:Math.floor(Date.now()/1000)+3600,sub:owner,role:'authenticated'})+'.ZmFrZQ';
      return reply({user,access_token:token,refresh_token:'local-fixture',token_type:'bearer',expires_in:3600});
    }
    if(url.pathname==='/auth/v1/user'){
      if(options.method==='PUT' && JSON.parse(options.body).password==='fixture password two')sessionStorage.setItem('test:password-changed','yes');
      return reply(user);
    }
    if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
    const table=url.pathname.split('/').pop();
    if(!url.pathname.startsWith('/rest/v1/'))return send(input,options);
    if(url.pathname.startsWith('/rest/v1/rpc/')) {
      const args=JSON.parse(options.body),key='test:rows:fd_groomers',saved=JSON.parse(sessionStorage.getItem(key)||'[]');
      const log=JSON.parse(sessionStorage.getItem('test:directory-requests')||'[]');log.push({name:table,args});sessionStorage.setItem('test:directory-requests',JSON.stringify(log));
      if(table==='fd_find_directory_cities') {
        const clean=v=>v.toLowerCase().replace(/[^a-z0-9]/g,'');
        const cityList=[{id:'sarasota-fl',name:'Sarasota',state:'FL',aliases:['sarasota']},{id:'st-petersburg-fl',name:'St. Petersburg',state:'FL',aliases:['stpetersburg','saintpetersburg','stpete']},{id:'tampa-fl',name:'Tampa',state:'FL',aliases:['tampa']}];
        const query=clean(args.p_query);
        if(query==='sa')await new Promise(r=>setTimeout(r,600));
        return reply(cityList.filter(c=>query.length>=2&&c.aliases.some(a=>a.startsWith(query)||query===a+'fl')));
      }
      if(table==='fd_search_directory') {
        if(sessionStorage.getItem('test:directory-fail')==='yes')return reply({message:'Fixture unavailable'},503);
        const terms=args.p_query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        const found=directory.filter(r=>r.service_city_ids.includes(args.p_city_id)&&r.service_flags[args.p_service]===true&&(args.p_mode==='all'||r.location_flags[args.p_mode]===true)&&terms.every(term=>r.business_name.toLowerCase().split(/[^a-z0-9]+/).some(word=>word.startsWith(term))));
        return reply(found.slice(args.p_offset,args.p_offset+21));
      }
      if(table==='fd_save_directory_groomer') {
        let contact=saved.find(r=>r.directory_business_id===args.p_business_id);
        if(!contact){const row=directory.find(r=>r.id===args.p_business_id);if(!row)return reply({message:'Unavailable'},400);
          contact={id:crypto.randomUUID(),owner_id:owner,name:'',business:row.business_name,address:row.address,email:row.email,phone:row.phone,directory_business_id:row.id,entry_source:'auto_populated'};saved.push(contact);sessionStorage.setItem(key,JSON.stringify(saved));}
        return reply(contact);
      }
      if(table==='fd_submit_directory_groomer') {
        let contact=saved.find(r=>r.id===args.p_contact_id);
        if(!contact){contact={id:args.p_contact_id,owner_id:owner,...args.p_contact,entry_source:'user_entered'};saved.push(contact);sessionStorage.setItem(key,JSON.stringify(saved));}
        sessionStorage.setItem('test:last-submission',JSON.stringify(args));return reply(contact);
      }
      throw Error('Unexpected directory RPC');
    }
    if(!['fd_owner_profiles','fd_dogs','fd_grooms','fd_groomers','fd_dog_photos'].includes(table))throw Error('Unexpected table');
    const key='test:rows:'+table;
    const rows=JSON.parse(sessionStorage.getItem(key)||'[]');
    if(options.method==='POST') {
      const value=JSON.parse(options.body);
      if(rows.some(row=>table==='fd_owner_profiles'?row.owner_id===value.owner_id:row.id===value.id))return reply({code:'23505',message:'Duplicate'},409);
      rows.push({...value,created_at:new Date().toISOString()});
      sessionStorage.setItem(key,JSON.stringify(rows));
      return new Response(null,{status:201});
    }
    let filtered=rows.filter(row=>[...url.searchParams].every(([field,value])=>!value.startsWith('eq.')||row[field]===value.slice(3)));
    if(options.method==='PATCH') {
      filtered.forEach(row=>Object.assign(row,JSON.parse(options.body)));
      sessionStorage.setItem(key,JSON.stringify(rows));
    }
    const sort=(url.searchParams.get('order')||'').split(',').filter(Boolean);
    filtered.sort((a,b)=>{for(const order of sort){const [field,direction]=order.split('.');const result=String(a[field]||'').localeCompare(String(b[field]||''));if(result)return direction==='desc'?-result:result;}return 0;});
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||filtered.length);
    filtered=filtered.slice(offset,offset+limit);
    if(new Headers(options.headers).get('Accept')?.includes('vnd.pgrst.object')) return reply(filtered[0]||null);
    return reply(filtered);
  };
}
