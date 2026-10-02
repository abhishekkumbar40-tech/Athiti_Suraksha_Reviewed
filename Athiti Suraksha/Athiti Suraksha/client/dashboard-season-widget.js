/* Athiti Suraksha — dashboard-season-widget.js
   Drop this script into your existing dashboard. It shows a compact seasonal
   destination widget and refreshes every hour while the dashboard is open. */
(function(){
const W={places:[],user:null,last:0};
const $=id=>document.getElementById(id);
function hav(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function season(m){return m===12||m<=2?'Winter':m<=5?'Summer':m<=9?'Monsoon':'Post-Monsoon'}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
async function weather(p){try{const u=`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,rain,wind_speed_10m&timezone=auto`;const d=await(await fetch(u)).json();return d.current}catch(e){return null}}
async function init(targetId){
 const root=$(targetId);if(!root)return;
 root.innerHTML=`<div style="background:#0d1b2a;border:1px solid #20364e;border-radius:16px;padding:15px;color:#fff;font-family:system-ui"><div style="display:flex;justify-content:space-between;gap:10px"><b>🌏 Seasonal places near you</b><button id="aspRefresh" style="background:#43d9a3;border:0;border-radius:9px;padding:7px 10px;cursor:pointer">Refresh</button></div><div id="aspMeta" style="color:#9fb1c5;font-size:12px;margin:7px 0">Detecting location…</div><div id="aspCards">Loading…</div></div>`;
 const r=await fetch('places.json');W.places=await r.json();await locate(targetId);$('aspRefresh').onclick=()=>refresh(targetId);setInterval(()=>refresh(targetId),3600000);
}
async function locate(targetId){if(!navigator.geolocation){return refresh(targetId)}navigator.geolocation.getCurrentPosition(async pos=>{W.user={lat:pos.coords.latitude,lon:pos.coords.longitude};await refresh(targetId)},()=>refresh(targetId),{enableHighAccuracy:true,maximumAge:300000,timeout:12000})}
async function refresh(targetId){
 const root=$(targetId);if(!root)return;const m=new Date().getMonth()+1;const candidates=W.places.filter(p=>p.bestMonths.includes(m)).map(p=>({...p,d:W.user?hav(W.user.lat,W.user.lon,p.lat,p.lon):99999})).sort((a,b)=>a.d-b.d).slice(0,4);
 const ws=await Promise.all(candidates.map(weather));$('aspMeta').textContent=`${season(m)} • Updated ${new Date().toLocaleTimeString()} • ${W.user?'location-aware':'all-India fallback'}`;
 $('aspCards').innerHTML=candidates.map((p,i)=>`<div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #20364e"><div style="flex:1"><b>${esc(p.name)}</b><div style="color:#9fb1c5;font-size:11px">${esc(p.state)} • ${p.d===99999?'Location unavailable':Math.round(p.d)+' km'} ${ws[i]?`• ${ws[i].temperature_2m}°C`:''}</div></div><a target="_blank" href="season_places.html?place=${encodeURIComponent(p.id)}" style="color:#43d9a3;text-decoration:none;font-size:12px">View →</a></div>`).join('');
}
window.AthitiSeasonWidget={init};
})();