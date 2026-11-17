// Local contract fixture for the browser test. No email or request leaves localhost.
export function installAuthFixture() {
  const config={url:location.origin,publishableKey:'sb_publishable_local_fixture'};
  Object.defineProperty(window,'FD_CONFIG',{get:()=>config,set:()=>{}});
  const send=window.fetch.bind(window);
  const owner='11111111-1111-4111-8111-111111111111';
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url||input,location.href);
    if(url.origin!==location.origin)throw Error('External request is outside this fixture.');
    const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
    if(url.pathname==='/auth/v1/otp'){
      const data=JSON.parse(options.body);
      sessionStorage.setItem('test:mail',JSON.stringify({email:data.email,redirect:url.searchParams.get('redirect_to')}));
      return reply({});
    }
    if(url.pathname==='/auth/v1/user')return reply({id:owner,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}});
    if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
    const table=url.pathname.split('/').pop();
    if(!url.pathname.startsWith('/rest/v1/'))return send(input,options);
    if(!['fd_owner_profiles','fd_dogs','fd_grooms'].includes(table))throw Error('Unexpected table');
    const key='test:rows:'+table;
    const rows=JSON.parse(sessionStorage.getItem(key)||'[]');
    if(options.method==='POST') {
      const value=JSON.parse(options.body);
      rows.push({...value,created_at:new Date().toISOString()});
      sessionStorage.setItem(key,JSON.stringify(rows));
      return new Response(null,{status:201});
    }
    const filtered=rows.filter(row=>[...url.searchParams].every(([field,value])=>!value.startsWith('eq.')||row[field]===value.slice(3)));
    if(new Headers(options.headers).get('Accept')?.includes('vnd.pgrst.object')) return reply(filtered[0]||null);
    return reply(filtered);
  };
}
