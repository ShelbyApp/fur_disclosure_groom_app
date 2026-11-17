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
