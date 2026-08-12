const d={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,frontdeskAppStoreUrl:"",revenuePeriod:"30d",revenueCustomStart:"",revenueCustomEnd:"",revenueCache:{},revenueLoading:!1,revenueError:"",revenueRequestId:0,blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",assistantData:null,assistantLoading:!1,assistantError:"",supportThread:null,supportUnreadCount:0,launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all","custom"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,frontdeskInstallReported:!1,nativeNotificationState:"",guestPushSubscriberCount:0,bookingReviewSettings:{reminderMinutes:15,maxReminders:3},bookingConflicts:[],operationalReadiness:null,operationalReadinessLoading:!1,_magicLoginPending:!1,editRooms:[],editRates:null,editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesExpanded:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Le=(e,t,o=[])=>{const i=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(t).forEach(n=>{i.setAttribute(n,String(t[n]))}),o.length&&o.forEach(n=>{const r=Le(...n);i.appendChild(r)}),i};var nt=([e,t,o])=>Le(e,t,o);/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rt=e=>Array.from(e.attributes).reduce((t,o)=>(t[o.name]=o.value,t),{}),at=e=>typeof e=="string"?e:!e||!e.class?"":e.class&&typeof e.class=="string"?e.class.split(" "):e.class&&Array.isArray(e.class)?e.class:"",st=e=>e.flatMap(at).map(o=>o.trim()).filter(Boolean).filter((o,i,n)=>n.indexOf(o)===i).join(" "),dt=e=>e.replace(/(\w)(\w*)(_|-|\s*)/g,(t,o,i)=>o.toUpperCase()+i.toLowerCase()),Pe=(e,{nameAttr:t,icons:o,attrs:i})=>{const n=e.getAttribute(t);if(n==null)return;const r=dt(n),a=o[r];if(!a)return;const s=rt(e),[l,g,x]=a,y={...g,"data-lucide":n,...i,...s},S=st(["lucide",`lucide-${n}`,s,i]);S&&Object.assign(y,{class:S});const I=nt([l,y,x]);return e.parentNode?.replaceChild(I,e)};/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lt=["svg",E,[["path",{d:"M10 4 8 6"}],["path",{d:"M17 19v2"}],["path",{d:"M2 12h20"}],["path",{d:"M7 19v2"}],["path",{d:"M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ct=["svg",E,[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],["circle",{cx:"7",cy:"17",r:"2"}],["path",{d:"M9 17h6"}],["circle",{cx:"17",cy:"17",r:"2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pt=["svg",E,[["path",{d:"M20 6 9 17l-5-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ut=["svg",E,[["path",{d:"m15 18-6-6 6-6"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=["svg",E,[["path",{d:"m9 18 6-6-6-6"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mt=["svg",E,[["path",{d:"M2 12h20"}],["path",{d:"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{d:"m4 8 16-4"}],["path",{d:"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ft=["svg",E,[["path",{d:"m12 15 2 2 4-4"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ht=["svg",E,[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14"}],["path",{d:"M2 20h3"}],["path",{d:"M13 20h9"}],["path",{d:"M10 12v.01"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xt=["svg",E,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yt=["svg",E,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}],["path",{d:"M2 12h20"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vt=["svg",E,[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bt=["svg",E,[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wt=["svg",E,[["circle",{cx:"11",cy:"4",r:"2"}],["circle",{cx:"18",cy:"8",r:"2"}],["circle",{cx:"20",cy:"16",r:"2"}],["path",{d:"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kt=["svg",E,[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3"}],["path",{d:"M21 21v.01"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7"}],["path",{d:"M3 12h.01"}],["path",{d:"M12 3h.01"}],["path",{d:"M12 16v.01"}],["path",{d:"M16 12h1"}],["path",{d:"M21 12v.01"}],["path",{d:"M12 21v-1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=["svg",E,[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=["svg",E,[["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["polyline",{points:"16 6 12 2 8 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"15"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=["svg",E,[["path",{d:"M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=["svg",E,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12 18h.01"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=["svg",E,[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}],["path",{d:"M20 3v4"}],["path",{d:"M22 5h-4"}],["path",{d:"M4 17v2"}],["path",{d:"M5 18H3"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=["svg",E,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=["svg",E,[["path",{d:"m10 20-1.25-2.5L6 18"}],["path",{d:"M10 4 8.75 6.5 6 6"}],["path",{d:"M10.585 15H10"}],["path",{d:"M2 12h6.5L10 9"}],["path",{d:"M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"}],["path",{d:"m4 10 1.5 2L4 14"}],["path",{d:"m7 21 3-6-1.5-3"}],["path",{d:"m7 3 3 6h2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=["svg",E,[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2"}],["polyline",{points:"17 2 12 7 7 2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=["svg",E,[["path",{d:"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mt=["svg",E,[["path",{d:"M12 20h.01"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=["svg",E,[["path",{d:"M12.8 19.6A2 2 0 1 0 14 16H2"}],["path",{d:"M17.5 8a2.5 2.5 0 1 1 2 4H2"}],["path",{d:"M9.8 4.4A2 2 0 1 1 11 8H2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=({icons:e={},nameAttr:t="data-lucide",attrs:o={}}={})=>{if(!Object.values(e).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof document>"u")throw new Error("`createIcons()` only works in a browser environment.");const i=document.querySelectorAll(`[${t}]`);if(Array.from(i).forEach(n=>Pe(n,{nameAttr:t,icons:e,attrs:o})),t==="data-lucide"){const n=document.querySelectorAll("[icon-name]");n.length>0&&Array.from(n).forEach(r=>Pe(r,{nameAttr:"icon-name",icons:e,attrs:o}))}},Lt={Bath:lt,Car:ct,Check:pt,ChevronLeft:ut,ChevronRight:gt,CookingPot:mt,CopyCheck:ft,DoorOpen:ht,Ellipsis:xt,Globe:yt,Inbox:vt,Laptop:bt,PawPrint:wt,QrCode:kt,Rocket:Et,Share:St,Shirt:Bt,Smartphone:At,Sparkles:Tt,SquarePlus:zt,ThermometerSnowflake:It,Tv:Ct,Waves:Pt,Wifi:Mt,Wind:Rt};window.lucide={createIcons(e={}){Ot({...e,icons:Lt})}};function Yo(){return Promise.resolve()}async function Dt(e){if(!e||!e.type.startsWith("image/")||e.type==="image/webp"&&e.size<4e5)return e;try{const t=await createImageBitmap(e),o=1600,i=1200;let n=t.width,r=t.height;const a=Math.min(1,o/n,i/r);n=Math.round(n*a),r=Math.round(r*a);const s=document.createElement("canvas");s.width=n,s.height=r,s.getContext("2d").drawImage(t,0,0,n,r),t.close();const l=await new Promise((x,y)=>{s.toBlob(S=>S?x(S):y(new Error("encode failed")),"image/webp",.82)}),g=(e.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([l],g+".webp",{type:"image/webp"})}catch{return e}}function Wo(){const e=()=>{d.currentFilter==="apps"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(e,{timeout:2500}):setTimeout(e,600)}const $t=["cancelled","canceled","released"];function Jo(e){return e?$t.includes(String(e.status||"").trim().toLowerCase()):!0}function Ft(e){Object.assign(window,e)}const Ht=14,Nt=10;function he(e,t,o){return Math.max(t,Math.min(e,o))}function M(e,t,o,i){return{left:e,top:t,width:o,height:i,right:e+o,bottom:t+i}}function qt(){const e=window.visualViewport,t=e?e.offsetLeft:0,o=e?e.offsetTop:0,i=e?e.width:window.innerWidth,n=e?e.height:window.innerHeight;return M(t,o,i,n)}function D(e){if(!e||!e.isConnected)return null;const t=e.getBoundingClientRect();return t.width<2||t.height<2?null:M(t.left,t.top,t.width,t.height)}function jt(e,t){if(!e||!t)return 0;const o=Math.max(0,Math.min(e.right,t.right)-Math.max(e.left,t.left)),i=Math.max(0,Math.min(e.bottom,t.bottom)-Math.max(e.top,t.top));return o*i}function Ut(e,t){return Math.max(0,t.left-e.left)+Math.max(0,e.right-t.right)+Math.max(0,t.top-e.top)+Math.max(0,e.bottom-t.bottom)}function Vt(e,t){let o=0;for(const i of t||[]){const n=document.querySelector(i);if(!n||getComputedStyle(n).display==="none")continue;const r=D(n);!r||r.bottom<e.bottom-2||r.top>=e.bottom||(o=Math.max(o,e.bottom-r.top))}return o}function Gt(e){const t=qt(),o=e.margin??Ht,i=Math.max(Number(e.bottomInset||0),Vt(t,e.avoidBottomSelectors)),n=t.left+o+Number(e.leftInset||0),r=t.top+o+Number(e.topInset||0),a=t.right-o-Number(e.rightInset||0),s=t.bottom-o-i;return M(n,r,Math.max(1,a-n),Math.max(1,s-r))}function _t(e){return e==="above"||e==="top"?["top","bottom","right","left"]:e==="right"?["right","left","bottom","top"]:e==="left"?["left","right","bottom","top"]:["bottom","top","right","left"]}function Yt(e,t,o,i,n){return e==="top"?M(t.left+(t.width-o)/2,t.top-i-n,o,i):e==="right"?M(t.right+n,t.top+(t.height-i)/2,o,i):e==="left"?M(t.left-o-n,t.top+(t.height-i)/2,o,i):M(t.left+(t.width-o)/2,t.bottom+n,o,i)}function Wt(e,t){const o=he(e.left,t.left,Math.max(t.left,t.right-e.width)),i=he(e.top,t.top,Math.max(t.top,t.bottom-e.height));return M(o,i,e.width,e.height)}function Jt(e){let t=e&&e.parentElement;for(;t&&t!==document.body&&t!==document.documentElement;){const o=getComputedStyle(t),i=o.overflowY||o.overflow;if(/(auto|scroll)/.test(i)&&t.scrollHeight>t.clientHeight+1)return t;t=t.parentElement}return null}function Kt(e,t){if(!e||Math.abs(t)<1)return!1;const o=Jt(e);return o?o.scrollTop+=t:window.scrollBy({top:t,left:0,behavior:"auto"}),!0}function me(e,t){const o=D(e);if(!o||t.height<60)return!1;let i;return o.height<=t.height?i=he(o.top,t.top,t.bottom-o.height):i=t.bottom-o.height,Kt(e,o.top-i)}function De(e,t){const o=getComputedStyle(e);for(const r of o)t.style.setProperty(r,o.getPropertyValue(r),o.getPropertyPriority(r));const i=e.children,n=t.children;for(let r=0;r<i.length;r+=1)n[r]&&De(i[r],n[r])}function Qt(e){e.removeAttribute("id"),e.querySelectorAll("[id]").forEach(t=>t.removeAttribute("id"))}function Zt(e,t){const o=e.querySelectorAll("input, textarea, select"),i=t.querySelectorAll("input, textarea, select");o.forEach((n,r)=>{const a=i[r];a&&(n.type==="checkbox"||n.type==="radio"?a.checked=n.checked:a.value=n.value)})}function Xt(e,t={}){if(!e||!e.isConnected||t.disabled||!D(e))return null;const i=e.cloneNode(!0);Qt(i),De(e,i),Zt(e,i),i.setAttribute(t.attribute||"data-adaptive-tour-spotlight","1"),i.setAttribute("aria-hidden","true"),i.style.position="fixed",i.style.margin="0",i.style.maxWidth="none",i.style.zIndex=String(t.zIndex||100002),i.style.pointerEvents="none",i.style.transform="none",t.prepareClone?.(i,e);const n=e.style.visibility;t.hideSource&&(e.style.visibility="hidden"),document.body.appendChild(i);const r=()=>{const s=D(e);return s?(i.style.display="",i.style.left=`${s.left}px`,i.style.top=`${s.top}px`,i.style.width=`${s.width}px`,i.style.height=`${s.height}px`,s):(i.style.display="none",null)},a=()=>{i.remove(),t.hideSource&&(e.style.visibility=n)};return r(),{element:i,source:e,update:r,destroy:a}}function eo({tooltip:e,panel:t,target:o,anchor:i,spotlight:n,options:r={}}){if(!e||!t||!o)return null;let a=0,s=!1,l=!1,g=!1,x="";const y=(c=!0)=>{if(s||!e.isConnected||!o.isConnected)return null;const u=Gt(r),w=`${u.left}:${u.top}:${u.width}:${u.height}`;x&&x!==w&&(l=!1,c=!0),x=w;const p=D(i)||D(o),f=D(o);if(!p||!f)return null;const h=Math.min(Number(r.maxWidth||380),u.width);e.style.position="fixed",e.style.right="auto",e.style.bottom="auto",e.style.width=`${h}px`,e.style.maxWidth=`${h}px`,e.style.margin="0",e.style.justifyContent="flex-start",t.style.maxHeight=`${Math.max(120,u.height)}px`;const v=Math.min(t.offsetHeight||e.offsetHeight||190,u.height),b=Number(r.gap??Nt);c&&!l&&r.autoScroll!==!1&&f.height+v+b<=u.height&&(l=me(o,u),l&&requestAnimationFrame(()=>y(!1)));const k=_t(r.preferredPlacement).map((z,O)=>{const Y=Yt(z,p,h,v,b),Ie=Ut(Y,u),Ce=jt(Y,f);return{placement:z,index:O,raw:Y,overflow:Ie,overlap:Ce,score:Ie*1e5+Ce*100+O}}),T=k.find(z=>z.overflow<.5&&z.overlap<1),A=T||k.slice().sort((z,O)=>z.score-O.score)[0],C=r.forceDock===!0||!T;let P="floating",$;if(C){P="docked";const z=Math.min(v,Number(r.dockMaxHeight||Math.max(180,u.height*.42)),u.height);t.style.maxHeight=`${z}px`;const O=Math.min(t.offsetHeight||z,z);if($=M(u.left+(u.width-h)/2,u.bottom-O,h,O),c&&!l&&r.autoScroll!==!1){const Y=M(u.left,u.top,u.width,Math.max(60,$.top-b-u.top));l=me(o,Y),l&&requestAnimationFrame(()=>y(!1))}}else if($=Wt(A.raw,u),c&&!l&&r.autoScroll!==!1){let z=u;if(A.placement==="bottom")z=M(u.left,u.top,u.width,Math.max(60,$.top-b-u.top));else if(A.placement==="top"){const O=$.bottom+b;z=M(u.left,O,u.width,Math.max(60,u.bottom-O))}l=me(o,z),l&&requestAnimationFrame(()=>y(!1))}return e.dataset.tourLayoutMode=P,e.dataset.tourPlacement=C?"bottom-dock":A.placement,e.style.left=`${$.left}px`,e.style.top=`${$.top}px`,n?.update?.(),r.onLayout?.({mode:P,placement:e.dataset.tourPlacement,viewport:u,targetRect:D(o),anchorRect:D(i)||D(o),tooltipRect:$}),{mode:P,placement:e.dataset.tourPlacement,rect:$}},S=(c=!1)=>{g=g||c===!0,!(s||a)&&(a=requestAnimationFrame(()=>{a=0;const u=g;g=!1,y(u)}))},I=()=>{l=!1,S(!0)},V=typeof ResizeObserver=="function"?new ResizeObserver(S):null;V?.observe(o),i&&i!==o&&V?.observe(i),V?.observe(t),window.addEventListener("resize",I),window.addEventListener("orientationchange",I),window.addEventListener("scroll",S,!0),window.visualViewport&&(window.visualViewport.addEventListener("resize",I),window.visualViewport.addEventListener("scroll",S));const ge=()=>{s=!0,a&&cancelAnimationFrame(a),V?.disconnect(),window.removeEventListener("resize",I),window.removeEventListener("orientationchange",I),window.removeEventListener("scroll",S,!0),window.visualViewport&&(window.visualViewport.removeEventListener("resize",I),window.visualViewport.removeEventListener("scroll",S))},m=y(!0);return{destroy:ge,reposition:()=>y(!1),result:m}}function U(e){return typeof window<"u"&&typeof window[e]=="function"?window[e]:null}function ne(...e){return U("setFilter")?.(...e)}function Me(...e){return U("setBookingsSubview")?.(...e)}function to(...e){return U("toast")?.(...e)}function re(...e){return U("updateGoLiveBanner")?.(...e)}function oo(...e){return U("seedTourRevenueShell")?.(...e)}function io(...e){return U("finishTourHydration")?.(...e)}function no(...e){return U("goLive")?.(...e)}let Q=null,ae=null,_=null;function q(){if(document.getElementById("frontdeskTourPolishStyle"))return;const e=document.createElement("style");e.id="frontdeskTourPolishStyle",e.textContent=`
    #tourBlurOverlay {
      -webkit-backdrop-filter: blur(1.25px);
      backdrop-filter: blur(1.25px);
      animation: tourOverlayFade 0.18s ease-out;
      transition: background 0.25s ease;
    }
    #tourTooltip {
      box-sizing: border-box;
      font-family: inherit;
    }
    .tour-panel {
      pointer-events: auto;
      width: 100%;
      max-width: 560px;
      max-height: calc(100dvh - 28px);
      overflow-y: auto;
      background: #fff;
      color: #1A2B22;
      border: 1.5px solid #D8E4DC;
      border-radius: 18px;
      box-shadow: 0 22px 58px rgba(26,43,34,0.24);
      padding: 14px;
      animation: tourPanelIn 0.2s ease-out;
    }
    .tour-progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tour-progress-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #6B7D72;
      white-space: nowrap;
    }
    .tour-progress-track {
      height: 6px;
      flex: 1;
      border-radius: 999px;
      background: #E6EEE9;
      overflow: hidden;
    }
    .tour-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2E7D5B, #4CAF7D);
      transition: width 0.2s ease;
    }
    .tour-title {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.22;
      margin-bottom: 6px;
      color: #1A2B22;
      letter-spacing: 0;
    }
    .tour-copy {
      font-size: 13px;
      color: #4B5D52;
      line-height: 1.48;
      margin: 0 0 13px;
    }
    .tour-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tour-btn {
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      border: 1.5px solid #D8E4DC;
      background: #fff;
      color: #1A2B22;
      transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
    }
    .tour-btn:disabled {
      color: #A8B5AD;
      cursor: default;
    }
    .tour-btn:not(:disabled):active {
      transform: translateY(1px);
    }
    .tour-btn-ghost {
      border-color: transparent;
      background: transparent;
      color: #6B7D72;
    }
    .tour-btn-primary {
      margin-left: auto;
      padding: 10px 18px;
      border-color: #2E7D5B;
      background: #2E7D5B;
      color: #fff;
      font-size: 14px;
      font-weight: 850;
      box-shadow: 0 8px 20px rgba(46,125,91,0.22);
    }
    @media (max-width: 420px) {
      .tour-panel {
        border-radius: 16px;
        padding: 13px;
      }
      .tour-title {
        font-size: 16px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.42;
      }
      .tour-actions {
        flex-wrap: wrap;
      }
      .tour-btn-primary {
        flex: 1 0 100%;
        margin-left: 0;
      }
    }
    @media (max-height: 680px) {
      .tour-panel {
        max-height: calc(100dvh - 20px);
        padding: 12px;
        border-radius: 16px;
      }
      .tour-progress-row {
        margin-bottom: 8px;
      }
      .tour-title {
        font-size: 16px;
        margin-bottom: 5px;
      }
      .tour-copy {
        font-size: 12.5px;
        line-height: 1.38;
        margin-bottom: 10px;
      }
      .tour-btn {
        min-height: 38px;
        padding: 8px 11px;
      }
      .tour-btn-primary {
        padding: 9px 16px;
      }
    }
    @keyframes tourPanelOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.98); }
    }
    @keyframes tourPageIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes tourOverlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes tourPanelIn {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #tourBlurOverlay,
      .tour-panel {
        animation: none !important;
      }
      #tourBlurOverlay {
        transition: none !important;
      }
      .tour-progress-fill {
        transition: none !important;
      }
    }
  `,document.head.appendChild(e)}function ke(){Q&&(document.removeEventListener("keydown",Q),Q=null)}function ro(e){ke(),Q=t=>{if(t.defaultPrevented)return;const o=t.target&&t.target.tagName?t.target.tagName.toLowerCase():"";o==="input"||o==="textarea"||o==="select"||t.target?.isContentEditable||(t.key==="Escape"?(t.preventDefault(),e.onSkip?.()):t.key==="Enter"||t.key==="ArrowRight"?(t.preventDefault(),e.onNext?.()):t.key==="ArrowLeft"&&(t.preventDefault(),e.onBack?.()))},document.addEventListener("keydown",Q)}function fe(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function L(e){q();const t=e||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText="position:fixed;inset:0;z-index:99998;",document.body.appendChild(o)),o.style.background=t.dim||"rgba(17,24,39,0.22)",o.style.pointerEvents=t.blockPointer?"auto":"none",t.lockScroll&&(document.body.style.overflow="hidden"),o}const te="rgba(17,24,39,0.42)";function W(){const e=document.getElementById("tourTooltip"),t=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!e||t)return Promise.resolve();e.style.pointerEvents="none";const o=e.firstElementChild;return o&&(o.style.animation="tourPanelOut 0.16s ease-in forwards"),new Promise(i=>setTimeout(i,150))}function ao(e,t){return _?.destroy(),_=Xt(e,{attribute:"data-tour-spotlight-clone",zIndex:99999,prepareClone(o){o.style.boxShadow=t?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",o.style.outline=t?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",o.style.outlineOffset=t?.spotlightOutlineOffset??"2px",t?.spotlightBackground&&(o.style.background=t.spotlightBackground,o.style.backgroundColor=t.spotlightBackground),t?.spotlightBorderRadius&&(o.style.borderRadius=t.spotlightBorderRadius)}}),_?.element||null}function H(e){const t=e||{};ke(),ae?.destroy(),ae=null,_?.destroy(),_=null;const o=document.getElementById("tourTooltip");o&&o.remove();const i=document.getElementById("tourBlurOverlay");i&&!t.keepOverlay&&i.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(r=>r.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex=r.dataset.tourOrigZIndex||"",r.style.isolation=r.dataset.tourOrigIsolation||"",r.style.boxShadow=r.dataset.tourOrigBoxShadow||"",r.style.outline=r.dataset.tourOrigOutline||"",r.style.outlineOffset=r.dataset.tourOrigOutlineOffset||"",r.style.transition=r.dataset.tourOrigTransition||"",r.style.borderRadius=r.dataset.tourOrigBorderRadius||"",r.style.opacity=r.dataset.tourOrigOpacity||"";const a=r.dataset.tourOrigBackground||"",s=r.dataset.tourOrigBackgroundColor||"";s?r.style.backgroundColor=s:r.style.removeProperty("background-color"),a?r.style.background=a:r.style.removeProperty("background"),r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition,delete r.dataset.tourOrigZIndex,delete r.dataset.tourOrigIsolation,delete r.dataset.tourOrigBoxShadow,delete r.dataset.tourOrigOutline,delete r.dataset.tourOrigOutlineOffset,delete r.dataset.tourOrigTransition,delete r.dataset.tourOrigBackground,delete r.dataset.tourOrigBackgroundColor,delete r.dataset.tourOrigBorderRadius,delete r.dataset.tourOrigOpacity});const n=document.getElementById("goLiveBanner");n&&n.dataset.tourHidden&&(delete n.dataset.tourHidden,typeof re=="function"&&re()),t.keepOverlay||(document.body.style.overflow="")}function so(){const e=document.getElementById("tourTooltip"),t=Array.from(document.querySelectorAll("[data-tour-spotlight-clone]")),o=Array.from(document.querySelectorAll("[data-tour-highlighted]")),i=[e,...t,...o].filter(Boolean);return!i.length&&!o.length?(H({keepOverlay:!0}),Promise.resolve()):(ke(),window.matchMedia("(prefers-reduced-motion: reduce)").matches?(H({keepOverlay:!0}),Promise.resolve()):(e&&(e.style.pointerEvents="none"),i.forEach(r=>{r.style.transition="opacity 0.07s ease, transform 0.07s ease",r.style.opacity="1"}),requestAnimationFrame(()=>{i.forEach(r=>{r.style.opacity="0",r.id==="tourTooltip"&&(r.style.transform="translateY(4px)")})}),new Promise(r=>{setTimeout(()=>{H({keepOverlay:!0}),r()},85)})))}function lo(e){const t=[e,...document.querySelectorAll("[data-tour-spotlight-clone]"),...document.querySelectorAll("[data-tour-highlighted]")].filter(Boolean);t.forEach(o=>{o.style.transition="opacity 0.1s ease, transform 0.1s ease",o.style.opacity="0",o.id==="tourTooltip"&&(o.style.transform="translateY(4px)")}),requestAnimationFrame(()=>{t.forEach(o=>{o.style.opacity="1",o.id==="tourTooltip"&&(o.style.transform="translateY(0)")})})}function G(e,t){if(!t.openAccordion)return;const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const r=o.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}}function j(e){if(!e)return null;for(const t of String(e).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(t);if(o&&o.isConnected)return o}return null}function J(e,t){if(t.highlightSelector){const o=j(t.highlightSelector);if(o)return o}if(t.highlightCard){const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(o)return o}return t.targetParent&&(e.closest(".booking-card")||e.closest(".accordion-body"))||e}function oe(e,t){if(!t)return e;const o=String(t.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const n=document.querySelector(i);if(n&&n.isConnected)return n}if(t.accordionCard){const i=document.querySelector(t.accordionCard);if(i&&i.isConnected)return i}return e&&e.isConnected?e:null}function se(e,t){if(!e||!e.isConnected)return null;const o=e.getBoundingClientRect();return o.width<2||o.height<2||!t&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function $e(e,t){const o=j(e.anchorSelector);if(o){const i=se(o,!0);if(i)return i}return se(t,!0)}function Re(e,t){const o=e.tooltipAnchorSelector||e.anchorSelector,i=j(o);if(i){const n=se(i,!0);if(n)return n}return $e(e,t)}function de(e){const t=e||"auto";try{window.scrollTo({top:0,left:0,behavior:t})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const n=document.querySelector(i);n&&(n.scrollTop=0)})}function Fe(e,t,o){const i=o||{},n=t.scrollTarget||t.accordionCard,r=(n?j(n):null)||e;if(!r&&!t.scrollToTop)return Promise.resolve();const a=t.scrollBlock||"nearest",s=window.matchMedia("(prefers-reduced-motion: reduce)").matches,l=i.smooth&&!s?"smooth":d.settingsTourActive||s?"auto":"smooth";return new Promise(g=>{if(t.scrollToTop&&(de(l),t.scrollToTopOnly)){requestAnimationFrame(()=>requestAnimationFrame(()=>{t.forcePageTop&&de("auto"),g()}));return}if(!r){g();return}if(r.scrollIntoView({behavior:l,block:a,inline:"nearest"}),l==="auto"){requestAnimationFrame(()=>requestAnimationFrame(g));return}let x=!1;const y=()=>{x||(x=!0,window.removeEventListener("scrollend",S),clearTimeout(I),requestAnimationFrame(()=>requestAnimationFrame(g)))},S=()=>y();"onscrollend"in window&&window.addEventListener("scrollend",S,{once:!0});const I=setTimeout(y,520)})}function He(){H(),localStorage.setItem("settingsTourStep","handoff");const e=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&ne("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},t=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof t=="function"?t().then(e).catch(e):e()}function K(){H({keepOverlay:!0}),q(),d.settingsTourActive=!1,re(),L({blockPointer:!0,lockScroll:!0,dim:te});const e=document.createElement("div");if(e.id="tourTooltip",e.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:24px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="copy-check" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Ready to share</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Your booking page is set up.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.55;margin:0 0 16px;">Copy the link, put it where guests already find you, and keep Front Desk open for new reservations.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:14px;">
          <div style="display:flex;flex-direction:column;gap:11px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">1</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Share the link</strong> on Google Business Profile, your website, texts, ads, and QR signs.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">2</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Watch bookings arrive</strong> in Front Desk with guest details and card verification status.</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;">
              <span style="width:22px;height:22px;border-radius:50%;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:850;flex-shrink:0;">3</span>
              <span style="font-size:13px;color:#1A2B22;line-height:1.45;"><strong>Confirm and collect</strong> payment at check-in using your normal process.</span>
            </div>
          </div>
        </div>
        <div style="background:#fff7ed;border-radius:12px;padding:11px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
          <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">Bookings start when guests see the link. Put it in front of real traffic before judging results.</p>
        </div>
        <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 8px 20px rgba(46,125,91,0.22);">Copy booking link</button>
      </div>
    </div>`,document.body.appendChild(e),!document.getElementById("tourModalAnimStyle")){const t=document.createElement("style");t.id="tourModalAnimStyle",t.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(t)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const o="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(o).catch(()=>{}),W().then(()=>{H(),d.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),to("Booking link copied!","success"),io(),Ne()})}}function Ne(e){q();const t=document.createElement("div");t.id="testDriveOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Activation</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">Go live when you are ready.</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.6;margin:0 0 18px;">Your link is copied. Activate when you want guests to submit real bookings through this page.</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Booking page accepts reservations</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Card verification helps reduce no-shows</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Front Desk shows new bookings</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">No OTA commission</span></div>
          </div>
        </div>
        <button id="activateNowBtn" style="width:100%;padding:15px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">$199/mo - Go live now</button>
        <p style="font-size:11px;color:#6B7D72;margin:0 0 14px;text-align:center;">Cancel anytime. No contracts.</p>
        <button id="activateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep page inactive for now</button>
      </div>
    </div>`,document.body.appendChild(t),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const o=()=>{t.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{o(),no()},document.getElementById("activateLaterBtn").onclick=()=>{o();const i=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');i&&ne("bookings",i)}}function xe(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),K();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),d.settingsTourActive=!0,re(),oo();const e=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');e&&ne("settings",e);function t(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!d.editRoomsLoadPromise)return;const u=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;u&&u()}t();const o=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the property name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center"},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] [data-tour-room-details-anchor="1"]',tooltipAnchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10,spotlightBackground:"#fff",spotlightBorderRadius:"12px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0"},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start"},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",subview:"bookings",customModal:"bookings"},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"bookings",subview:"revenue",waitForVisible:!0,scrollBlock:"start"},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function n(m){H(m)}function r(){W().then(()=>{n({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),K()})}function a(m,c){return!(!m||!c||m.customModal||c.customModal||m.tab!==c.tab||!m.target||!c.target)}function s(m,c){if(m.customModal){g(m,c);return}requestAnimationFrame(()=>g(m,c))}function l(m){const c=m||{};if(c.keepCurrentUi||n({keepOverlay:!0}),document.body.style.overflow="",i>=o.length){n({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),K();return}const u=o[i];if(u.subview==="revenue"&&!d.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),l();return}if(u.tab==="apps"&&!(isStandaloneApp()||d.frontdeskInstalled)&&u.target&&!u.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),l();return}if(u.customModal||L(),u.tab&&u.tab!==d.currentFilter){const w=document.querySelector(`.tab[data-nav-filter="${u.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${u.tab}"]`);if(w&&ne(u.tab,w),u.tab==="bookings"&&u.subview&&Me(u.subview),u.tab==="apps"){const p=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof p=="function"&&p(!0)}s(u,c);return}if(u.tab==="bookings"&&u.subview&&u.subview!==d.bookingsSubview){Me(u.subview),s(u,c);return}s(u,c)}function g(m,c){const u=c||{};if(m.customModal==="homescreen"){u.keepCurrentUi&&n({keepOverlay:!0}),I();return}if(m.customModal==="bookings"){u.keepCurrentUi&&n({keepOverlay:!0}),ge();return}if(m.customModal==="availability"){u.keepCurrentUi&&n({keepOverlay:!0}),V();return}if(m.customModal==="finale"){u.keepCurrentUi&&n({keepOverlay:!0}),K();return}if(m.customModal==="guestAppsStory"){u.keepCurrentUi&&n({keepOverlay:!0}),He();return}if(m.waitForVisible){const f=m.target.split(",").map(k=>k.trim());let h=0;const v=30;L();const b=d.settingsTourActive?60:200,B=()=>{if(h++,m.tab==="apps"){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}let k=null;for(const T of f)if(k=document.querySelector(T),k)break;if(k&&(m.openAccordion&&G(k,m),m.openAccordion||k.offsetParent!==null)){x(k,m,u);return}h<v?setTimeout(B,b):(i++,localStorage.setItem("settingsTourStep",String(i)),l())};B();return}function w(f){const h=f.target.split(",").map(v=>v.trim());for(const v of h){const b=document.querySelector(v);if(b&&!(!f.openAccordion&&b.offsetParent===null&&getComputedStyle(b).position!=="fixed"))return b}if(f.accordionCard){const v=document.querySelector(f.accordionCard);if(v)return v}return null}function p(f,h){const v=w(f);if(v){h(v);return}const b=f.tab==="settings"&&!f.customModal&&f.target,B=f.tab==="apps"&&!f.customModal&&f.target;if(!b&&!B){i++,localStorage.setItem("settingsTourStep",String(i)),l();return}L();let k=0;if(b&&t(),B){const C=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof C=="function"&&C(!0)}const T=d.settingsTourActive?60:250,A=()=>{if(k++,B){const P=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof P=="function"&&P(!0)}const C=w(f);if(C){h(C);return}if(t(),B){const P=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof P=="function"&&P(!0)}k<48?setTimeout(A,T):(i++,localStorage.setItem("settingsTourStep",String(i)),l())};A()}p(m,f=>x(f,m,u))}function x(m,c,u){const w=u||{};if(G(m,c),m=J(m,c),(!m||!m.isConnected)&&(m=oe(m,c),m&&(m=J(m,c))),!m){i++,localStorage.setItem("settingsTourStep",String(i)),l();return}const p=m;L(),Fe(p,c,{smooth:!!w.keepCurrentUi}).then(()=>{if(c.forcePageTop&&de("auto"),!p.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),l();return}G(p,c),w.keepCurrentUi&&(n({keepOverlay:!0}),L()),c.noHighlight||(p.dataset.tourOrigPosition||(p.dataset.tourOrigPosition=p.style.position||""),p.dataset.tourOrigZIndex||(p.dataset.tourOrigZIndex=p.style.zIndex||""),p.dataset.tourOrigIsolation||(p.dataset.tourOrigIsolation=p.style.isolation||""),p.dataset.tourOrigBoxShadow||(p.dataset.tourOrigBoxShadow=p.style.boxShadow||""),p.dataset.tourOrigOutline||(p.dataset.tourOrigOutline=p.style.outline||""),p.dataset.tourOrigOutlineOffset||(p.dataset.tourOrigOutlineOffset=p.style.outlineOffset||""),p.dataset.tourOrigTransition||(p.dataset.tourOrigTransition=p.style.transition||""),p.dataset.tourOrigBackground||(p.dataset.tourOrigBackground=p.style.background||""),p.dataset.tourOrigBackgroundColor||(p.dataset.tourOrigBackgroundColor=p.style.backgroundColor||""),p.dataset.tourOrigBorderRadius||(p.dataset.tourOrigBorderRadius=p.style.borderRadius||""),p.dataset.tourOrigOpacity||(p.dataset.tourOrigOpacity=p.style.opacity||""),p.style.position=p.style.position||"relative",p.style.zIndex="99999",p.style.isolation="isolate",p.style.transition="box-shadow 0.18s ease, outline 0.18s ease",p.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",p.style.outline="1px solid rgba(255,255,255,0.82)",p.style.outlineOffset="2px",c.spotlightBoxShadow!=null&&(p.style.boxShadow=c.spotlightBoxShadow),c.spotlightOutline!=null&&(p.style.outline=c.spotlightOutline),c.spotlightOutlineOffset!=null&&(p.style.outlineOffset=c.spotlightOutlineOffset),c.spotlightBackground&&(p.style.background=c.spotlightBackground,p.style.backgroundColor=c.spotlightBackground),c.spotlightBorderRadius&&(p.style.borderRadius=c.spotlightBorderRadius),w.keepCurrentUi&&(p.style.opacity="0"),p.setAttribute("data-tour-highlighted","1")),document.body.style.overflow="";const f=()=>{const b=j(c.anchorSelector)||p;if(c.freezeTooltip){const A=b&&b.isConnected?b.getBoundingClientRect():null;y(b,c,A&&A.width>=2?A:null,{fadeIn:!!w.keepCurrentUi});return}const B=oe(p,c);let k=B?J(B,c):p;G(k,c);const T=c.tooltipAnchor?null:Re(c,k);y(k||p,c,T,{fadeIn:!!w.keepCurrentUi})};if(c.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(f));return}const h=(v=0)=>{requestAnimationFrame(()=>{if(c.forcePageTop&&de("auto"),c.tooltipAnchor){f();return}const b=oe(p,c);let B=b?J(b,c):p;G(B,c);const k=Re(c,B);if(!k&&v<4){requestAnimationFrame(()=>h(v+1));return}y(B||p,c,k,{fadeIn:!!w.keepCurrentUi})})};h(0)})}function y(m,c,u,w){const p=w||{},f=document.getElementById("tourTooltip");f&&f.remove(),q();const h=document.createElement("div");h.id="tourTooltip";const v=Math.min(i+1,o.length),b=Math.max(8,Math.min(100,Math.round(v/o.length*100))),B=fe(c.title||"Quick setup"),k=fe(c.text||""),T=c.primaryLabel||(i<o.length-1?"Next":"Got it"),A=i<=0;h.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",h.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${B}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${v} of ${o.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${b}%;"></div>
          </div>
        </div>
        <div class="tour-title">${B}</div>
        <p class="tour-copy">${k}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${A?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${fe(T)}</button>
        </div>
      </div>`,document.body.appendChild(h);const C=h.querySelector(".tour-panel"),P=j(c.tooltipAnchorSelector||c.anchorSelector)||m;c.noHighlight||ao(m,c),ae?.destroy(),ae=eo({tooltip:h,panel:C,target:m,anchor:P,spotlight:_,options:{preferredPlacement:c.tooltipPosition||"auto",maxWidth:380,gap:c.tooltipGap??10,autoScroll:c.autoScroll!==!1,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),h.style.visibility="visible",p.fadeIn&&lo(h),S()}function S(){const m=document.getElementById("tourNextBtn"),c=document.getElementById("tourSkipBtn"),u=v=>{if(v<0)return;const b=a(o[i],o[v]),B=()=>{i=v,localStorage.setItem("settingsTourStep",String(i)),l({keepCurrentUi:b})};so().then(B)},w=()=>{u(i+1)},p=()=>{r()},f=()=>{i<=0||u(i-1)};m&&(m.onclick=w),c&&(c.onclick=p);const h=document.getElementById("tourBackBtn");h&&(h.onclick=f),ro({onNext:w,onBack:f,onSkip:p})}function I(){q(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms(),L({blockPointer:!0,lockScroll:!0,dim:te});const m=d.activeHotelName||"Your Property",c=m.trim().charAt(0).toUpperCase(),u=m.length>10?m.slice(0,10):m,w="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",p="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",f="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",h=`<div style="${w}"><div style="${p}background:rgba(255,255,255,0.22);"></div><div style="${f}"></div></div>`,v=d.activeHotelAppIcon||"",b=v?`<img src="${v}" alt="" style="width:100%;height:100%;object-fit:contain;">`:c,B=v?`${p}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${p}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,k=`<div style="${w}"><div style="${B}">${b}</div><div style="${f}font-size:7.5px;color:#fff;font-weight:700;">${u}</div></div>`,T=[h,h,h,h,k,h,h,h].join(""),A=document.createElement("div");if(A.id="tourTooltip",A.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",A.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${T}
            </div>
          </div>
        </div>
        <div style="padding:20px 22px 22px;text-align:center;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">1 of ${o.length}</div>
            <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
              <div style="height:100%;width:${Math.round(1/o.length*100)}%;border-radius:999px;background:#2E7D5B;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">You're on their home screen</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${m}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your property from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(A),!document.getElementById("tourModalAnimStyle")){const C=document.createElement("style");C.id="tourModalAnimStyle",C.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(C)}document.getElementById("tourNextBtn").onclick=()=>{W().then(()=>{n({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),l()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}}function V(){q(),L({blockPointer:!0,lockScroll:!0,dim:te});let m=0;const c=[`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Your Availability Calendar</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">See room availability at a glance</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:12px;">
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sun</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Mon</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Tue</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Wed</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Thu</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Fri</div>
            <div style="text-align:center;font-size:10px;font-weight:600;color:#6b7280;padding:4px 0;">Sat</div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">9</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">10</div><div style="font-size:10px;color:#92400e;font-weight:600;">2</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">11</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#FEE2E2;border:1.5px solid #E05252;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">12</div><div style="font-size:10px;color:#991b1b;font-weight:600;">0</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">13</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:8px;padding:6px 2px;text-align:center;"><div style="font-size:11px;font-weight:700;color:#1a1a2e;">14</div><div style="font-size:10px;color:#2E7D5B;font-weight:600;">3</div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #D8E4DC;">
            <div style="background:#E8F5EE;border:1.5px solid #2E7D5B;border-radius:6px;padding:4px 6px;text-align:center;"><div style="font-size:10px;font-weight:700;color:#1a1a2e;">8</div><div style="font-size:9px;color:#2E7D5B;font-weight:600;">4</div></div>
            <div style="font-size:11px;color:#374151;line-height:1.3;"><span style="font-weight:600;">8</span> = date &nbsp;·&nbsp; <span style="font-weight:600;">4</span> = rooms available</div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#E8F5EE;border:1.5px solid #2E7D5B;"></div><span style="font-size:11px;color:#374151;">Open</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEF3C7;border:1.5px solid #F59E0B;"></div><span style="font-size:11px;color:#374151;">Partial</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:50%;background:#FEE2E2;border:1.5px solid #E05252;"></div><span style="font-size:11px;color:#374151;">Full</span></div>
          </div>
        </div>
      </div>`,`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">Tap Any Day to Adjust</div>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Control exactly how many rooms are available</p>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f8faf9;border-radius:14px;padding:14px;border:1px solid #D8E4DC;">
          <div style="display:flex;justify-content:center;margin-bottom:12px;">
            <div style="background:#2E7D5B;border:2px solid #1a5c3f;border-radius:10px;padding:8px 12px;text-align:center;box-shadow:0 0 0 3px rgba(46,125,91,0.3);">
              <div style="font-size:12px;font-weight:700;color:white;">10</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.8);font-weight:600;">4</div>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:10px;">
            <span style="font-size:11px;color:#6b7280;">↓ opens this</span>
          </div>
          <div style="background:white;border-radius:12px;padding:16px;border:1.5px solid #D8E4DC;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:12px;">Wed, Jun 10</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">−</div>
              <div style="font-size:28px;font-weight:700;color:#1a1a2e;">3</div>
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#374151;border:1.5px solid #D8E4DC;">+</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8faf9;border-radius:8px;border:1px solid #D8E4DC;">
              <span style="font-size:12px;font-weight:600;color:#374151;">Close for this day</span>
              <div style="width:36px;height:20px;border-radius:10px;background:#D8E4DC;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;left:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div></div>
            </div>
          </div>
        </div>
      </div>`,`<div style="padding:20px 18px 0;">
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:15px;font-weight:700;color:#1a1a2e;">That's It</div>
        </div>
      </div>
      <div style="padding:0 14px 14px;">
        <div style="background:#f0fdf4;border-radius:12px;padding:16px;border:1px solid #bbf7d0;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">✅</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Rooms default to <strong>open</strong> with all units available</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">🔒</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Toggle <strong>close</strong> on days you're fully booked</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">🔢</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Use +/− to reduce units when partially booked</span>
            </div>
          </div>
        </div>
      </div>`],u=document.createElement("div");u.id="tourTooltip",u.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";let w=!1;function p(){const h=m>=c.length-1?"Next — Bookings →":"Next →",v=w?"none":"tourPanelIn 0.22s ease-out",b=w?"tourPageIn 0.18s ease-out":"none";u.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">
            ${c[m]}
          </div>
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${c.map((B,k)=>`<div style="width:8px;height:8px;border-radius:50%;background:${k===m?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${h}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,w=!0,document.getElementById("tourNextBtn").onclick=()=>{m<c.length-1?(m++,p()):W().then(()=>{n({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),l()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}}if(document.body.appendChild(u),p(),!document.getElementById("tourModalAnimStyle")){const f=document.createElement("style");f.id="tourModalAnimStyle",f.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(f)}}function ge(){q(),L({blockPointer:!0,lockScroll:!0,dim:te});let m=0,c=!1;const u=[`
          <div style="padding:20px 18px 0;text-align:center;">
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Bookings</div>
            <div style="font-size:17px;font-weight:800;color:#1a1a2e;">A guest books. You see everything.</div>
            <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 14px;">The guest is confirmed immediately. The booking stays marked until you verify the room.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:1px solid #D8E4DC;border-radius:16px;overflow:hidden;box-shadow:0 8px 22px rgba(26,43,34,0.07);">
            <div style="height:5px;background:#F59E0B;"></div>
            <div style="padding:15px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                <div>
                  <div style="font-size:16px;font-weight:750;color:#1a1a2e;">Sarah Johnson</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">Just now</div>
                </div>
                <div style="font-size:18px;font-weight:750;color:#2E7D5B;">$284.00</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                  <span style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;font-size:11px;font-weight:750;padding:4px 9px;border-radius:20px;">● Needs verification</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">🛏 King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">🌙 3 nights</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px;background:#f8faf9;border-radius:10px;margin-bottom:12px;">
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-in</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 15</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Check-out</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">Jun 18</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;">Guests</div>
                  <div style="font-size:12px;font-weight:750;color:#1a1a2e;margin-top:2px;">2</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:10px 11px;">
                  <div style="font-size:11px;color:#9A3412;line-height:1.4;"><strong>Already confirmed.</strong><br>Check your other calendars, then verify.</div>
                  <div style="font-size:18px;">✓</div>
              </div>
            </div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Booking alerts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">See the important details immediately.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 15px;">The notification shows the room, stay, guest, and amount. Tap it to open the confirmed booking.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="max-width:318px;margin:0 auto 14px;padding:60px 10px 16px;border-radius:31px;background:linear-gradient(155deg,#B5C8C0 0%,#DCE5E1 48%,#AFC2BA 100%);box-shadow:0 12px 28px rgba(26,43,34,.15);">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;background:rgba(247,247,249,.94);border:.5px solid rgba(255,255,255,.78);border-radius:19px;padding:11px 13px 12px;text-align:left;box-shadow:0 2px 8px rgba(0,0,0,.11);backdrop-filter:blur(18px);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
                <div style="width:23px;height:23px;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="/marketellogo.svg" alt="" style="width:18px;height:18px;object-fit:contain;">
                </div>
                <div style="font-size:10px;font-weight:600;letter-spacing:.02em;color:#737477;">FRONT DESK</div>
                <div style="margin-left:auto;font-size:10px;color:#8E8E93;">now</div>
              </div>
              <div style="font-size:13px;font-weight:650;color:#111114;line-height:1.25;margin-bottom:2px;">New confirmed booking</div>
              <div style="font-size:12px;color:#2C2C2E;line-height:1.38;">King Room · Jun 15–18<br>Sarah Johnson · $284 due at check-in</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:9px;padding:11px 12px;background:#F8FAF9;border:1px solid #E1E9E4;border-radius:12px;text-align:left;">
            <div style="width:28px;height:28px;border-radius:50%;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0;">→</div>
            <div style="font-size:11px;color:#4B5D52;line-height:1.45;"><strong style="color:#1A2B22;">Tap to review.</strong> The booking opens with the full details and your next action.</div>
          </div>
        </div>`,`
        <div style="padding:20px 18px 0;text-align:center;">
          <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:5px;">Stay ahead of conflicts</div>
          <div style="font-size:17px;font-weight:800;color:#1a1a2e;">Remind, review, then correct availability.</div>
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">Choose how often to be reminded until you check. If a walk-in or another channel already took the room, cancel this booking and update Availability.</p>
        </div>
        <div style="padding:0 14px 14px;">
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px 12px;margin-bottom:9px;">
            <div style="font-size:9px;color:#6B7280;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;">If I have not reviewed it</div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:9px 10px;font-size:11px;font-weight:750;color:#1A2B22;">
              <span>Remind every 15 minutes · up to 3 times</span><span style="color:#9CA3AF;">▾</span>
            </div>
          </div>
          <div style="background:#fff;border:1px solid #D8E4DC;border-radius:14px;padding:13px;box-shadow:0 6px 18px rgba(26,43,34,0.06);">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:10px;">
              <div>
                <div style="font-size:14px;font-weight:850;color:#1A2B22;">Sarah Johnson</div>
                <div style="font-size:10px;color:#6B7280;margin-top:2px;">Booked online · King Room · Tomorrow</div>
              </div>
              <div style="font-size:13px;font-weight:850;color:#2E7D5B;">$284</div>
            </div>
            <div style="background:#F8FAF9;border-radius:10px;padding:10px 11px;margin-bottom:9px;">
              <div style="font-size:9px;color:#6B7280;font-weight:750;text-transform:uppercase;margin-bottom:4px;">Why are you cancelling?</div>
              <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:750;color:#1A2B22;">
                <span>The room was already taken</span><span style="color:#9CA3AF;">▾</span>
              </div>
            </div>
            <div style="background:#B91C1C;color:#fff;border-radius:10px;padding:10px;text-align:center;font-size:11px;font-weight:800;">Room changed? Cancel this booking</div>
          </div>
          <div style="background:#F8FAF9;border:1px solid #E1E9E4;border-radius:13px;padding:11px;margin-top:9px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:10px;font-weight:850;color:#1A2B22;">Then update Availability</div><div style="font-size:9px;color:#2E7D5B;font-weight:800;">Jun 15–17</div></div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
              ${["13","14","15","16","17","18","19"].map((f,h)=>`<div style="aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;${h>=2&&h<=4?"background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;text-decoration:line-through;":"background:#fff;color:#7B8C82;border:1px solid #E5ECE8;"}">${f}</div>`).join("")}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:8px 9px;font-size:10px;font-weight:750;color:#1A2B22;"><span>0 rooms available</span><span style="color:#9CA3AF;">▾</span></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px;">
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">✓</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">You checked it</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">↩</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Cancel if needed</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">▦</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Dates stop selling</div>
            </div>
          </div>
        </div>`],w=document.createElement("div");w.id="tourTooltip",w.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";const p=()=>{const f=m>=u.length-1,h=m===0?"Next — Phone alerts →":m===1?"Next — Avoid conflicts →":"Next — Availability →",v=c?"none":"tourPanelIn 0.22s ease-out",b=c?"tourPageIn 0.18s ease-out":"none";w.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">${u[m]}</div>
          <div style="padding:2px 18px 7px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;">
              ${u.map((B,k)=>`<div style="width:8px;height:8px;border-radius:50%;background:${k===m?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:750;cursor:pointer;">${h}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,c=!0,document.getElementById("tourNextBtn").onclick=()=>{if(!f){m++,p();return}W().then(()=>{n({keepOverlay:!0}),i++,localStorage.setItem("settingsTourStep",String(i)),l()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}};if(document.body.appendChild(w),p(),!document.getElementById("tourModalAnimStyle")){const f=document.createElement("style");f.id="tourModalAnimStyle",f.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(f)}}l()}function R(){return typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()}function pe(){return document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1"}let ye=null;function F(e){return String(e??"").trim()}function ue(e,t={}){if(!(!pe()||window.parent===window))try{window.parent.postMessage({type:"marketel:editor-saved",kind:String(e||"booking-page"),hotelId:d.activeHotelId||"",...t},window.location.origin)}catch{}}function qe(){return`<div class="booking-card" style="margin-bottom:14px;">
    <div style="padding:18px;display:flex;align-items:center;gap:14px;">
      <div style="width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:13px;background:var(--green-pale);color:var(--green);font-size:19px;font-weight:800;">?</div>
      <div style="min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:7px;font-size:14px;font-weight:800;color:var(--text);">Need help? <span class="marketel-support-unread"></span></div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.45;margin:4px 0 0;">Ask a question, report a problem, or share feedback directly with Marketel.</p>
      </div>
      <button type="button" onclick="openMarketelSupport()" style="flex:0 0 auto;padding:10px 13px;border-radius:10px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Message us</button>
    </div>
  </div>`}function je(e=null){const t=R(),o=t?"https://guest-lodge-backend.onrender.com":"",i=e?.request||null,n=i?.scheduledFor?new Date(i.scheduledFor).toLocaleDateString([],{year:"numeric",month:"short",day:"numeric"}):"",r=t?i?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:13px;font-weight:700;color:#9a3412;">Account deletion scheduled</div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.5;margin:5px 0 10px;">Your property and account data will be deleted${n?` on ${n}`:""}. You can cancel until processing begins.</p>
        <button type="button" onclick="cancelAccountDeletion()" style="width:100%;padding:11px;border-radius:10px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Keep my Marketel account</button>
      </div>`:e?.ownerSession?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
          <button type="button" onclick="requestAccountDeletion()" style="border:0;background:none;padding:0;color:#b42318;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Delete Marketel account and property data</button>
          <p style="font-size:11px;color:var(--text-muted);line-height:1.45;margin:6px 0 0;">Includes a seven-day recovery window. The subscription is canceled when deletion completes.</p>
        </div>`:`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
          <button type="button" onclick="window.marketelNativeAction?.('signout')" style="border:0;background:none;padding:0;color:#b42318;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Sign in with the owner email to delete this account</button>
        </div>`:"";return`<div class="booking-card" id="privacyAccountCard" style="margin-bottom:14px;scroll-margin-top:96px;">
    <div style="padding:18px;">
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px;">Privacy &amp; account</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <a href="${o}/privacy" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Privacy Policy</a>
        <a href="${o}/terms" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Terms of Service</a>
        <a href="mailto:support@bookmarketel.com" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Email support</a>
      </div>
      ${r}
    </div>
  </div>`}async function Ue(){const e=document.getElementById("settingsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,o]=await Promise.all([api("GET","/api/crm/verify"),R()?api("GET","/api/crm/account-deletion/status").catch(()=>null):Promise.resolve(null)]),n="https://"+(t?.domain||d.activeHotelId+".mktel.co"),r="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(n),a=await api("GET","/api/crm/rooms");let s={nightly:69,weekly:299,monthly:999};a?.rates&&(s=a.rates);const l=a?.rooms||[];let g="";t?.subscribed||(g+=goLiveInlineCardHtml()),l.length?l.forEach(x=>{const y=x.images&&x.images.length>0;g+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${y?`<img src="${x.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${y?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${x.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${x.name}</div>
              ${x.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${x.description}</div>`:""}
            </div>
          </div>
        `}):g+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,g+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${n}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${n}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${r}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `,g+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${s.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${s.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${s.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `,g+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 6 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,t?.subscribed&&!R()&&(g+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),g+=qe(),g+=je(o),e.innerHTML=g,window.refreshSupportSummary?.()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function co(){const e=document.getElementById("settings-booking-url");e&&navigator.clipboard.writeText(e.value).then(()=>{localStorage.setItem("linkCopied","1"),X(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function po(){localStorage.setItem("settingsTourDone","1");const e=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",e);let t=0;const o=setInterval(()=>{t++;const i=document.getElementById("edit-rate-nightly");if(i||t>20){if(clearInterval(o),!i)return;const n=i.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const r=n.previousElementSibling?.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const a=i.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${a.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const l=document.getElementById("checklistPointer");l&&l.remove()},6e3)},1e3)},100)}},200)}function uo(){const t="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(t).then(()=>{localStorage.setItem("linkCopied","1"),X(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function go(e,t){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const n=setInterval(()=>{i++;const r=document.querySelector(e);if(r||i>20){if(clearInterval(n),!r)return;r.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const s=r.getBoundingClientRect(),l=document.createElement("div");l.id="checklistPointer",l.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,l.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${t}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(l),setTimeout(()=>{const g=document.getElementById("checklistPointer");g&&g.remove()},6e3)},1e3)}},200)}function Ee(){const e=String(d.token||localStorage.getItem("crmToken")||"").trim();return e&&(d.token=e),e}async function Se(e,t){const o=Ee();if(!o)throw new Error("Not logged in");const i=await Dt(t),n=new FormData;n.append("image",i,i.name||"room.webp");const r=new URLSearchParams;d.activeHotelId&&r.set("hotelId",d.activeHotelId);const a=await fetch(`/api/crm/rooms/${e}/images?${r}`,{method:"POST",headers:{"x-crm-token":o,...R()?{"x-marketel-client":"ios"}:{}},body:n}),s=await a.json().catch(()=>({}));if(!a.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${a.status})`);return s}async function mo(e,t){const o=e.target.files[0];if(o)try{await Se(t,o),toast("Photo uploaded!","success"),Ue()}catch(i){toast(i.message||"Upload failed","error")}}async function fo(){const e=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function ho(){const e=document.getElementById("settings-new-pin")?.value.trim();if(!e||e.length<6){toast("PIN must be at least 6 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(t){toast(t.message||"Failed to change PIN","error")}}async function xo(){window.openMarketelSupport?.()}function Ve(e={}){const t=d.activeHotelDomain||d.activeHotelId+".mktel.co",o=!R()&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"),i=new URL(o?"http://localhost:5173/":"https://"+t+"/");o&&i.searchParams.set("hotelId",d.activeHotelId),i.searchParams.set("preview","1"),e.highlight&&i.searchParams.set("previewHighlight",String(e.highlight)),e.roomId&&i.searchParams.set("previewHighlightRoom",String(e.roomId)),e.refresh&&i.searchParams.set("previewRefresh",String(Date.now())),typeof window.openInAppBrowser=="function"?window.openInAppBrowser(i.toString()):window.open(i.toString(),"_blank","noopener")}function Z(e,t=""){!d.hotelSubscribed||pe()||Ve({highlight:e,roomId:t,refresh:!0})}function Ge(){if(!R()&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&d.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(d.activeHotelId);const t=d.activeHotelDomain||"";return t?"https://"+t+"/":""}function yo(){const e=Ge();if(!e){toast("Your booking domain is still setting up.","info");return}typeof window.openInAppBrowser=="function"?window.openInAppBrowser(e):window.open(e,"_blank","noopener")}function vo(){const e=document.getElementById("previewSiteBar");e&&(e.style.display=d.currentFilter==="settings"?"block":"none")}function X(){if(localStorage.getItem("settingsTourDone"))return;const e=parseInt(localStorage.getItem("settingsTourStep")||"0"),t=d.editRooms.some(a=>a.images&&a.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");e===2&&t&&localStorage.setItem("settingsTourStep","3"),e===3&&i&&localStorage.setItem("settingsTourStep","4"),e===4&&o&&localStorage.setItem("settingsTourStep","5");const n=document.getElementById("tourTooltip");n&&n.remove();const r=document.getElementById("tourBlurOverlay");r&&r.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(a=>{a.style.position=a.dataset.tourOrigPosition||"",a.style.zIndex=a.dataset.tourOrigZIndex||"",a.style.isolation=a.dataset.tourOrigIsolation||"",a.style.boxShadow=a.dataset.tourOrigBoxShadow||"",a.style.outline=a.dataset.tourOrigOutline||"",a.style.outlineOffset=a.dataset.tourOrigOutlineOffset||"",a.style.transition=a.dataset.tourOrigTransition||"",a.style.borderRadius=a.dataset.tourOrigBorderRadius||"",a.style.opacity=a.dataset.tourOrigOpacity||"";const s=a.dataset.tourOrigBackground||"",l=a.dataset.tourOrigBackgroundColor||"";l?a.style.backgroundColor=l:a.style.removeProperty("background-color"),s?a.style.background=s:a.style.removeProperty("background"),a.removeAttribute("data-tour-highlighted"),delete a.dataset.tourOrigPosition,delete a.dataset.tourOrigZIndex,delete a.dataset.tourOrigIsolation,delete a.dataset.tourOrigBoxShadow,delete a.dataset.tourOrigOutline,delete a.dataset.tourOrigOutlineOffset,delete a.dataset.tourOrigTransition,delete a.dataset.tourOrigBackground,delete a.dataset.tourOrigBackgroundColor,delete a.dataset.tourOrigBorderRadius,delete a.dataset.tourOrigOpacity}),document.body.style.overflow=""}function bo(){let e=0;const t={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many bookable rooms or units do you offer?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),e>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",t).catch(()=>{})}catch{}_e();return}const r=o[e],a=document.createElement("div");a.id="onboardingOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",r.type==="text"?(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${r.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(a),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(t[r.key]=s,e++,i())}):(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${r.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(a),a.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{t[r.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{e++,i()},250)})}))}i()}function wo(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const e=new URL(window.location.href);e.searchParams.set("welcome","1"),e.searchParams.set("reveal","1"),e.searchParams.delete("tab");const t=e.pathname+e.search+e.hash;if(t===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(t)}function _e(){const e=document.createElement("div");e.id="welcomeModalOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function t(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const i=typeof xe=="function"?xe:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),e.remove()}function o(){e.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏡</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=t}document.body.appendChild(e),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function le(){const e=document.getElementById("postActivationTourTooltip");e&&e.remove();const t=document.getElementById("postActivationTourOverlay");t&&t.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function ie(){le(),localStorage.setItem("postActivationTourDone","1");const e=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",e)}catch{}}function Ye(){if(localStorage.getItem("postActivationTourDone")){ie();return}le();const e=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. Once the Front Desk app is connected, new bookings can alert you even when it is closed."},{tab:"apps",navFilter:"apps",text:"<strong>Last step: open Guest App.</strong> Share your property with guests, choose its icon and turn on the alerts that keep your Front Desk app connected."}];let t=0;function o(){if(le(),t>=e.length){ie();return}const i=e[t],n=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);n&&setFilter(i.tab,n);const r=document.createElement("div");r.id="postActivationTourOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(r),document.body.style.overflow="hidden",setTimeout(()=>{const a=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);a&&(a.setAttribute("data-post-activation-highlight","1"),a.style.position="relative",a.style.zIndex="100003",a.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",a.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=a?a.getBoundingClientRect():{left:24,bottom:80,width:200},l=document.createElement("div");l.id="postActivationTourTooltip";const g=Math.min(300,window.innerWidth-32),x=Math.max(16,Math.min(s.left+s.width/2-g/2,window.innerWidth-g-16)),y=Math.min(s.bottom+14,window.innerHeight-180);l.style.cssText=`position:fixed;z-index:100004;left:${x}px;top:${y}px;max-width:${g}px;width:${g}px;`;const S=t>=e.length-1;l.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${t+1} / ${e.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${S?"Open Guest App":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(l),document.getElementById("postActivationTourNext").onclick=()=>{t+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{ie()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=Ye;function ko(){if(document.getElementById("activatedModalOverlay"))return;const e=d.activeHotelDomain||(d.activeHotelId?d.activeHotelId+".mktel.co":""),t=e?`https://${e}`:"",o=String(d.frontdeskAppStoreUrl||"").trim(),i=o?`<a id="activatedModalDownload" href="${esc(o)}" target="_blank" rel="noopener" style="display:block;width:100%;padding:15px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;text-decoration:none;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;box-sizing:border-box;">Download Marketel Front Desk</a>`:'<button type="button" disabled style="display:block;width:100%;padding:15px;border-radius:12px;border:none;background:#dce8e1;color:#527061;font-family:inherit;font-size:15px;font-weight:800;cursor:not-allowed;">Front Desk app coming soon</button>',n=document.createElement("div");n.id="activatedModalOverlay",n.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",n.innerHTML=`
    <div style="background:white;border-radius:22px;padding:32px 24px 22px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="width:56px;height:56px;border-radius:50%;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:29px;font-weight:900;">✓</div>
      <h2 style="font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">You're live</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.55;margin:0 0 8px;">Guests can now book directly at</p>
      ${t?`<a href="${esc(t)}" target="_blank" rel="noopener" style="display:block;color:#2E7D5B;font-size:15px;font-weight:800;text-decoration:none;word-break:break-word;margin:0 0 22px;">${esc(e)}</a>`:'<div style="height:8px;"></div>'}
      ${i}
      <p style="font-size:12px;color:#7a857e;line-height:1.45;margin:10px 4px 4px;">Manage bookings, availability and alerts from your phone.</p>
      <button id="activatedModalContinueWeb" type="button" style="width:100%;padding:11px;margin-top:6px;border:0;background:transparent;color:#8a948e;font-family:inherit;font-size:13px;font-weight:650;cursor:pointer;">Continue to Web Front Desk</button>
    </div>
  `,document.body.appendChild(n),document.getElementById("activatedModalContinueWeb").onclick=()=>{n.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}async function Eo(){if(isEditPageDomReady())return;if(d.editRoomsLoadPromise)return d.editRoomsLoadPromise;const e=document.getElementById("editRoomsList");if(e){d.editRoomsLoadPromise=(async()=>{e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,o,i]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify"),R()?api("GET","/api/crm/account-deletion/status").catch(()=>null):Promise.resolve(null)]);if(!t.rooms)throw new Error("No data");d.editRooms=t.rooms;const n=o?.hotelName||"";n&&(d.activeHotelName=n),o&&(d.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const r=o?.hotelSubtitle||"",a=o?.hotelAddress||"",s=o?.hotelPhone||"";ye={name:F(n),subtitle:F(r),address:F(a),phone:F(s)};const l=o?.appIconUrl||"";d.activeHotelAppIcon=l,updateFrontdeskManifestLink();let g={nightly:69,weekly:299,monthly:999,taxRate:.1};t.rates&&(g=t.rates),d.editRates=g;const y="https://"+(o?.domain||d.activeHotelId+".mktel.co"),S=pe();let I=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${a}" id="edit-hotel-address" placeholder="Add your property address (optional)" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${n}" id="edit-hotel-name" placeholder="Your Property Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${r}" id="edit-hotel-subtitle" placeholder="Add a short description (optional)" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${s}" id="edit-hotel-phone" placeholder="Add your guest phone number (optional)" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo('header')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">${S||d.hotelSubscribed?"Save &amp; see changes":"Save"}</button>
        </div>
      </div>
      </div>
      <div class="dash-b">
      ${goLiveInlineCardHtml()}
      ${(typeof twoRoomExplainerHtml=="function"?twoRoomExplainerHtml:window.twoRoomExplainerHtml)("booking-page")}
      <div id="editRoomsCards"></div>
      <button id="edit-add-room-btn" style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:8px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add booking page room</button>
      </div>
      <div class="dash-c">
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Checkout Page Preview</div>
          <div style="background:#f4f7f9;border-radius:12px;overflow:hidden;border:1px solid var(--border);">
            <!-- Back button pill (matches .back-button-pill) -->
            <div style="padding:12px 16px 0;">
              <span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(16,185,129,0.2);">‹ Back to Booking</span>
            </div>
            <!-- Cancellation policy banner (matches .static-banner — white pill with shadow) -->
            <div style="padding:10px 16px;display:flex;justify-content:center;">
              <div style="background:white;border-radius:20px;padding:8px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border:2px dashed #10b981;width:fit-content;max-width:100%;position:relative;">
                <div style="position:absolute;top:-8px;right:8px;background:#10b981;color:white;font-size:8px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">Editable</div>
                <input type="text" value="${(o?.cancellationPolicy||"").replace(/"/g,"&quot;")}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;font-size:11px;color:#111827;font-weight:500;border:none;background:transparent;outline:none;font-family:inherit;text-align:center;">
              </div>
            </div>
            <!-- Progress bar (matches .checkout-progress-bar with pill step-circles) -->
            <div style="padding:8px 16px 14px;position:relative;">
              <div style="display:flex;justify-content:space-between;align-items:center;position:relative;">
                <!-- Connecting line -->
                <div style="position:absolute;top:11px;left:15%;right:15%;height:2px;background:#ddd;z-index:0;"></div>
                <!-- Step 1: Review Cart (active/completed) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:#28a745;border:2px solid #28a745;"></div>
                  <span style="font-size:10px;color:#000;font-weight:600;">Review Cart</span>
                </div>
                <!-- Step 2: Info (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Info</span>
                </div>
                <!-- Step 3: Payment (inactive) -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:4px;z-index:1;flex:1;">
                  <div style="width:40px;height:16px;border-radius:999px;background:white;border:2px solid #ccc;"></div>
                  <span style="font-size:10px;color:#888;">Payment</span>
                </div>
              </div>
            </div>
            <!-- Placeholder content -->
            <div style="padding:0 16px 14px;">
              <div style="background:white;border-radius:8px;padding:10px;border:1px solid var(--border);">
                <div style="height:8px;background:var(--border);border-radius:4px;margin-bottom:6px;width:60%;"></div>
                <div style="height:8px;background:var(--border);border-radius:4px;width:40%;"></div>
              </div>
            </div>
          </div>
          <p style="font-size:10px;color:var(--text-muted);margin-top:6px;text-align:center;">Edit the green banner above — shown to guests during checkout.</p>
          <button onclick="saveHotelInfo('policy')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;">Save Banner</button>
        </div>
      </div>
      <div class="booking-card" id="tour-booking-link-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">Your Booking Link</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${y}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${y.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
          </div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Use this link on your website, Google Business Profile, or in a message.</p>
        </div>
      </div>
      </div>
      <div class="dash-growth">
        <div id="yourPageGrowthPanel" style="scroll-margin-top:96px;">
          <div class="loading" style="padding:24px 0;"><div class="logo-sprite-bounce"></div> Loading direct-booking activity…</div>
        </div>
      </div>
      <div class="dash-d">
      <div class="booking-card" id="tour-rates-card" style="margin-bottom:14px;">
        <div class="page-utility-tabs" role="tablist" aria-label="Property tools">
          <button type="button" id="tour-rates-header" class="page-utility-tab active" data-utility-tab="rates" role="tab" aria-selected="true" onclick="selectPageUtility('tour-rates-card','rates')">Rates</button>
          <button type="button" id="tour-pin-header" class="page-utility-tab" data-utility-tab="pin" role="tab" aria-selected="false" onclick="selectPageUtility('tour-rates-card','pin')">Change PIN</button>
        </div>
        <div class="accordion-body page-utility-body" style="display:block;">
          <div class="page-utility-panel" data-utility-panel="rates">
            <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
                <input type="number" value="${g.nightly}" id="edit-rate-nightly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
                <input type="number" value="${g.weekly}" id="edit-rate-weekly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
                <input type="number" value="${g.monthly}" id="edit-rate-monthly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
            </div>
            <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${d.hotelSubscribed&&!S?"Save &amp; see changes":"Save Rates"}</button>
          </div>
          <div class="page-utility-panel" data-utility-panel="pin" hidden>
            <div style="margin-bottom:12px;">
              <input type="text" id="edit-new-pin" value="${d.isMasterPin?"":d.token}" placeholder="${d.isMasterPin?"Enter a unique property PIN":"Enter new PIN (min 6 chars)"}" style="width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
            </div>
            <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${d.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
          </div>
        </div>
      </div>
      ${o?.subscribed&&!R()?`<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
        </div>
      </div>`:""}
      ${qe()}
      ${je(i)}
      </div>
      </div>
    `;e.innerHTML=I,N(),window.renderGrowthPanel?.(),window.loadGrowthData?.().catch(()=>{}),window.refreshSupportSummary?.(),typeof lucide<"u"&&lucide.createIcons()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await d.editRoomsLoadPromise}finally{d.editRoomsLoadPromise=null}}}function Be(){N()}async function Ae({render:e=!0}={}){const t=await api("GET","/api/crm/rooms");if(!Array.isArray(t?.rooms))throw new Error("Could not refresh rooms");return d.editRooms=t.rooms,t.rates&&(d.editRates=t.rates),e&&N(),d.editRooms}function N(){const e=document.getElementById("editRoomsCards");if(e){if(!d.editRooms.length){e.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}e.innerHTML=d.editRooms.map((t,o)=>{const i=(t.amenities||"").split("•").map(a=>a.trim()).filter(Boolean),n=(t.images||[]).filter(a=>a&&a.url),r=jsStr(t.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${t.id}" ${o===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${n.length?`
          <img class="room-edit-main-img" src="${esc(n[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/room-placeholder.svg';">
          ${n.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${r}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${r}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${n.length}</div>
            <div class="room-edit-image-dots">
              ${n.map((a,s)=>`<button type="button" class="room-edit-image-dot ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${r}', ${s})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${r}')">
        </label>
      </div>
      ${n.length>1?'<div class="room-edit-thumbs">'+n.map((a,s)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${r}', ${s})"><img src="${esc(a.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/room-placeholder.svg';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${r}','${jsStr(a.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
      </div>
      <div class="room-edit-fields" style="padding:18px;">
        <div data-tour-room-details-anchor="1" style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Room Name</div>
          <input type="text" value="${t.name}" id="edit-name-${t.id}" style="width:100%;font-size:18px;font-weight:700;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Description</div>
          <input type="text" value="${(t.description||"").replace(/"/g,"&quot;")}" id="edit-desc-${t.id}" placeholder="e.g. A spacious room with king bed and city view" style="width:100%;font-size:14px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;color:var(--text);">
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Amenities</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;" id="edit-amenity-pills-${t.id}">
            ${i.map(a=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${Ke(a)} ${a} <button onclick="removeAmenity('${t.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
          </div>
          <button onclick="openAmenityPicker('${t.id}')" style="background:none;border:1.5px dashed var(--border);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:inherit;">+ Add amenities</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Max Guests</div>
            <input type="number" value="${t.maxOccupancy||4}" min="1" max="20" id="edit-occ-${t.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Total Units</div>
            <input type="number" value="${t.totalUnits||1}" min="1" max="200" id="edit-units-${t.id}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="saveEditRoom('${t.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${pe()||d.hotelSubscribed?"Save &amp; see changes":"Save Changes"}</button>
          <button class="room-edit-delete-btn" onclick="deleteEditRoom('${t.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function We(e){const t=d.editRooms.find(o=>String(o.id)===String(e));return(t&&t.images||[]).filter(o=>o&&o.url)}function Je(e,t){const o=We(e);if(!o.length)return;const i=document.getElementById("edit-card-"+e);if(!i)return;const n=o.length,r=((Number(t)||0)%n+n)%n,a=i.querySelector(".room-edit-main-img");a&&(a.src=o[r].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(r));const s=i.querySelector(".room-edit-photo-count");s&&(s.textContent=r+1+" / "+n),i.querySelectorAll(".room-edit-image-dot").forEach((l,g)=>{l.classList.toggle("active",g===r),g===r?l.setAttribute("aria-current","true"):l.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((l,g)=>{l.classList.toggle("active",g===r),g===r?l.setAttribute("aria-current","true"):l.removeAttribute("aria-current")})}function So(e,t){const i=document.getElementById("edit-card-"+e)?.querySelector(".room-edit-photo"),n=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;Je(e,n+t)}function Ke(e){const t=e.toLowerCase();return t.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':t.includes("tv")||t.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':t.includes("fridge")||t.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':t.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':t.includes("housekeeping")||t.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':t.includes("bath")||t.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':t.includes("work")||t.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':t.includes("pet")||t.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':t.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':t.includes("kitchen")||t.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const Qe=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let Te=null;function Ze(e){Te=e;const o=(d.editRooms.find(s=>s.id===e)?.amenities||"").split("•").map(s=>s.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
      <div id="amenityPickerModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;align-items:center;justify-content:center;padding:20px;">
        <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
          <div style="font-size:16px;font-weight:700;margin-bottom:14px;">Select Amenities</div>
          <div id="amenityPickerGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>
          <div style="margin-bottom:14px;">
            <input type="text" id="amenityCustomInput" placeholder="Or type a custom one..." style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:14px;outline:none;">
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="confirmAmenityPicker()" style="flex:1;padding:11px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Done</button>
            <button onclick="closeAmenityPicker()" style="padding:11px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:none;font-family:inherit;font-size:14px;color:#6b7280;cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    `),document.getElementById("amenityPickerModal").addEventListener("click",ce),i=document.getElementById("amenityPickerModal"));const n=d.editRooms[0];n&&String(n.id)===String(e)?i.dataset.previewActionScope="first-room-editor":delete i.dataset.previewActionScope;const a=document.getElementById("amenityPickerGrid");a.innerHTML=Qe.map(s=>{const l=o.some(g=>g.includes(s.key));return`<button onclick="toggleAmenityPreset(this,'${s.key}')" data-key="${s.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${l?"#2E7D5B":"#e5e7eb"};background:${l?"#E8F5EE":"white"};color:${l?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${s.icon}" style="width:14px;height:14px;"></i> ${s.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function Bo(e,t){const o=e.style.borderColor==="rgb(46, 125, 91)";e.style.borderColor=o?"#e5e7eb":"#2E7D5B",e.style.background=o?"white":"#E8F5EE",e.style.color=o?"#1a1a2e":"#2E7D5B"}function ce(){document.getElementById("amenityPickerModal").style.display="none",Te=null}function Ao(){const e=d.editRooms.find(n=>n.id===Te);if(!e){ce();return}const t=document.getElementById("amenityPickerGrid"),o=[];t.querySelectorAll("button").forEach(n=>{if(n.style.background==="rgb(232, 245, 238)"){const r=Qe.find(a=>a.key===n.dataset.key);r&&o.push(r.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),e.amenities=o.join(" • "),ce(),Be(),typeof lucide<"u"&&lucide.createIcons()}function To(e){Ze(e)}function zo(e,t){const o=d.editRooms.find(n=>n.id===e);if(!o)return;const i=(o.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);o.amenities=i.filter(n=>n!==t).join(" • "),Be(),typeof lucide<"u"&&lucide.createIcons()}async function Io(e="header"){const t=document.getElementById("edit-hotel-name")?.value.trim(),o=document.getElementById("edit-hotel-subtitle")?.value.trim(),i=document.getElementById("edit-hotel-address")?.value.trim(),n=document.getElementById("edit-hotel-phone")?.value.trim(),r=document.getElementById("edit-hotel-policy")?.value.trim(),a={name:t,subtitle:o,address:i,phone:n},s=Object.keys(a).filter(l=>F(a[l])!==F(ye?.[l]));try{if(await api("POST","/api/crm/hotel-info",{name:t,subtitle:o,address:i,phone:n,cancellationPolicy:r}),t&&(d.activeHotelName=t),toast("Property info saved!","success"),ye=Object.fromEntries(Object.entries(a).map(([l,g])=>[l,F(g)])),ue("header",{hotelName:t||"",changedFields:s.length?s:["header"]}),e==="header"){const l=new Set(["name","subtitle","address","phone"]),g=s.length===1&&l.has(s[0])?`header-${s[0]}`:"header";Z(g)}}catch{toast("Failed to save","error")}}async function Co(){const e=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),localStorage.setItem("ratesChanged","1"),d.launchStatus=null,X(),toast("Rates saved!","success"),Z("room",d.editRooms[0]?.id||"")}catch{toast("Failed to save rates","error")}}async function Po(){const e=document.getElementById("edit-new-pin")?.value.trim();if(!e||e.length<6){toast("PIN must be at least 6 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success")}catch(t){toast(t.message||"Failed to change PIN","error")}}function Mo(e){navigator.clipboard.writeText(e).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function Ro(e,t){const o=document.getElementById(e);o&&(o.querySelectorAll("[data-utility-tab]").forEach(i=>{const n=i.dataset.utilityTab===t;i.classList.toggle("active",n),i.setAttribute("aria-selected",n?"true":"false")}),o.querySelectorAll("[data-utility-panel]").forEach(i=>{i.hidden=i.dataset.utilityPanel!==t}))}function Oo(e){const t=e.nextElementSibling,o=e.querySelector(".accordion-arrow");t.style.display==="none"?(t.style.display="block",o&&(o.style.transform="rotate(90deg)")):(t.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let ee=!1;function Xe(){if(document.getElementById("goLiveOverlay"))return;const e=document.createElement("div");e.id="goLiveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100010;background:rgba(255,255,255,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",e.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(e)}function ve(){const e=document.getElementById("goLiveOverlay");e&&e.remove()}function Oe(e){let t=document.getElementById("goLiveOverlay");t||(t=document.createElement("div"),t.id="goLiveOverlay",document.body.appendChild(t)),t.style.cssText="position:fixed;inset:0;z-index:100020;background:rgba(15,23,20,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;",t.innerHTML=`<div role="alertdialog" aria-modal="true" aria-labelledby="goLiveErrorTitle" style="width:min(100%,420px);background:#fff;border:1px solid #d8e4dc;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(15,23,20,.28);text-align:center;box-sizing:border-box;">
    <div aria-hidden="true" style="width:44px;height:44px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#fff7ed;color:#9a3412;font-size:22px;font-weight:800;">!</div>
    <div id="goLiveErrorTitle" style="font-size:20px;font-weight:800;color:#1a2b22;line-height:1.2;">Checkout couldn't open</div>
    <div style="font-size:14px;line-height:1.55;color:#5f7066;margin:9px auto 18px;max-width:330px;">Your setup is saved. Try again, or contact us if secure checkout still won't open.</div>
    <button type="button" id="goLiveRetry" style="width:100%;min-height:48px;border:0;border-radius:14px;background:#2e7d5b;color:#fff;font:700 15px inherit;cursor:pointer;">Try secure checkout again</button>
    <button type="button" id="goLiveDismiss" style="width:100%;min-height:44px;margin-top:5px;border:0;background:transparent;color:#607168;font:700 13px inherit;cursor:pointer;">Back to activation</button>
    <a href="mailto:support@bookmarketel.com?subject=Marketel%20checkout%20help" style="display:inline-block;margin-top:8px;color:#2e7d5b;font-size:12px;font-weight:700;text-decoration:none;">Contact support</a>
  </div>`,t.querySelector("#goLiveDismiss")?.addEventListener("click",ve),t.querySelector("#goLiveRetry")?.addEventListener("click",()=>{ve(),e?.()})}async function be(e={}){if(R()){toast("Front Desk app access is managed with your Marketel account.","info");return}if(ee)return;const t=e?.billingInterval==="year"?"year":"month",o=t==="year"?1990:199;ee=!0,Xe();const i=window.MarketelJourney;i?.track("JourneyCheckoutRequested",{source:document.getElementById("marketelValueReveal")?"value-reveal":"frontdesk",price:o,currency:"USD",billingInterval:t},{immediate:!0});const n=i?.getContext?.()||{};try{const r=await api("POST","/api/crm/go-live",{journeyVisitorId:n.visitorId||"",journeySessionId:n.sessionId||"",journeySequence:n.sequence||null,billingInterval:t});if(r.success&&r.url){i?.track("JourneyCheckoutRedirected",{provider:"stripe",price:o,currency:"USD",billingInterval:t},{immediate:!0,keepalive:!0}),window.location.href=r.url;return}i?.track("JourneyCheckoutFailed",{stage:"create-checkout-session",reason:"server-rejected",serverMessage:String(r?.message||"").slice(0,160)},{immediate:!0}),ee=!1,Oe(()=>be(e))}catch(r){i?.track("JourneyCheckoutFailed",{stage:"create-checkout-session",reason:"network-or-server-error",errorName:String(r?.name||"").slice(0,80)},{immediate:!0}),ee=!1,Oe(()=>be(e))}}async function Lo(){if(R()){toast("Email support@bookmarketel.com for billing help.","info");return}try{const e=await api("GET","/api/crm/billing-portal");e.success&&e.url?window.location.href=e.url:toast(e.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function Do(){if(!confirm("Delete this Marketel account and all property data? The subscription will be canceled when deletion completes."))return;const e=prompt("Type DELETE to schedule permanent deletion after a seven-day recovery window.");if(String(e||"").trim().toUpperCase()==="DELETE")try{const t=await api("POST","/api/crm/account-deletion/request",{confirmation:"DELETE"});if(!t?.success)throw new Error(t?.message||"Could not schedule deletion.");toast("Account deletion scheduled. You can cancel during the next seven days.","success"),setTimeout(()=>window.location.reload(),900)}catch(t){toast(t.message||"Could not schedule account deletion.","error")}}async function $o(){try{const e=await api("POST","/api/crm/account-deletion/cancel");if(!e?.success)throw new Error(e?.message||"Could not cancel deletion.");toast("Account deletion cancelled.","success"),setTimeout(()=>window.location.reload(),700)}catch(e){toast(e.message||"Could not cancel account deletion.","error")}}async function Fo(){window.openMarketelSupport?.()}async function Ho(e){const t=d.editRooms.find(l=>l.id===e);if(!t){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+e)?.value.trim(),i=document.getElementById("edit-desc-"+e)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+e)?.value)||4,r=parseInt(document.getElementById("edit-units-"+e)?.value)||1,a={id:e,name:o||t.name,description:i||"",amenities:t.amenities||"",maxOccupancy:n,totalUnits:r},s=["name","description","amenities","maxOccupancy","totalUnits"].filter(l=>F(a[l])!==F(t[l]));try{const l=await api("POST","/api/crm/rooms",a);if(l&&l.success===!1){toast(l.message||"Failed to save","error");return}t.name=a.name,t.description=a.description,t.maxOccupancy=n,t.totalUnits=r,toast("Room saved!","success"),ue("room",{roomId:e,roomName:a.name,changedFields:s.length?s:["room"]}),Z("room",e)}catch(l){toast("Failed to save: "+(l.message||""),"error")}}async function No(e,t){const o=Array.from(e.target.files);if(!o.length)return;const n=document.getElementById("edit-card-"+t)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+t+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+t+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let r=0,a="";for(const l of o){try{const x=await Se(t,l);if(x.image){const y=d.editRooms.find(S=>S.id===t);y&&(y.images||(y.images=[]),y.images.push(x.image),y.imageUrl||(y.imageUrl=x.image.url)),r++}}catch(x){a=x.message||"Upload failed"}const g=document.getElementById("upload-progress-"+t);g&&(g.textContent=r+" / "+o.length)}const s=document.getElementById("upload-spinner-"+t);s&&s.remove(),N(),r>0&&(d.launchStatus=null),X(),r>0?(ue("room-photos",{roomId:t,changedFields:["photos"]}),toast(r+" photo"+(r!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"),Z("room-photo",t)):toast(a||"Upload failed","error")}function et(e,t=512){return new Promise((o,i)=>{const n=new Image,r=URL.createObjectURL(e);n.onload=()=>{try{const a=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-a)/2,l=(n.naturalHeight-a)/2,g=document.createElement("canvas");g.width=t,g.height=t;const x=g.getContext("2d");x.imageSmoothingQuality="high",x.drawImage(n,s,l,a,a,0,0,t,t),URL.revokeObjectURL(r),g.toBlob(y=>y?o(y):i(new Error("crop failed")),"image/png",.92)}catch(a){URL.revokeObjectURL(r),i(a)}},n.onerror=()=>{URL.revokeObjectURL(r),i(new Error("load failed"))},n.src=r})}function tt(){const e=document.getElementById("appsAppIconPreview");e&&(e.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function ze(e){const t=document.getElementById("appsAppIconPreview");t&&(t.style.background="#fff",t.style.border="1px solid var(--border)",t.style.padding="0",t.innerHTML='<img src="'+e+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function we(){const e=document.getElementById("appsAppIconPreview");if(!e)return;if(d.activeHotelAppIcon){ze(d.activeHotelAppIcon);return}const t=(d.activeHotelName||"P").trim().charAt(0).toUpperCase()||"🏡";e.style.background="transparent",e.style.border="none",e.style.padding="0",e.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+t+"</span>"}async function qo(e){const t=e.files&&e.files[0];if(!t)return;tt();const o=new FormData;try{const i=await et(t,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",t)}try{const i=Ee(),n=new URLSearchParams;d.activeHotelId&&n.set("hotelId",d.activeHotelId);const a=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":i,...R()?{"x-marketel-client":"ios"}:{}},body:o})).json();if(a.success&&a.appIconUrl){d.activeHotelAppIcon=a.appIconUrl,ze(a.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(d.activeHotelId||"")+"|"+a.appIconUrl+"|"+(d.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(a.message||"Failed to upload icon","error"),we()}catch{toast("Failed to upload icon","error"),we()}e.value=""}async function jo(e,t){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${e}/images/${t}`);const o=d.editRooms.find(i=>i.id===e);o&&o.images&&(o.images=o.images.filter(i=>i.id!==t),o.imageUrl=o.images[0]?.url||null),N(),toast("Photo deleted","success"),ue("room-photo-deleted",{roomId:e,changedFields:["photos"]}),Z("room-photo",e)}catch{toast("Failed to delete","error")}}async function Uo(e){if(!confirm("Delete this room from your booking page and Availability? Saved date changes will also be removed."))return;const t=d.editRooms.find(o=>o.id===e);try{if(await api("DELETE",`/api/crm/rooms/${e}`),d.editRooms=d.editRooms.filter(i=>i.id!==e),t){const i=d.manualAvailability||{rooms:[],overrides:{}};i.rooms=(i.rooms||[]).filter(n=>n.name!==t.name),i.overrides=Object.fromEntries(Object.entries(i.overrides||{}).filter(([n])=>!n.startsWith(`${t.name}|`))),d.manualAvailability=i,d.manualSelectedRoom===t.name&&(d.manualSelectedRoom=i.rooms[0]?.name||"")}N(),window.refreshRoomBadge?.(),window.renderAvailabilityView?.(),toast("Room deleted","success"),Ae({render:!0}).catch(()=>{}),window.loadManualAvailability?.({silent:!0})?.catch(()=>{})}catch(o){toast(o.message||"Failed to delete","error")}}function Vo(){document.getElementById("editAddRoomModal")||(document.body.insertAdjacentHTML("beforeend",`
    <div id="editAddRoomModal" class="edit-add-room-modal" role="dialog" aria-modal="true" aria-labelledby="editAddRoomTitle" onclick="if(event.target===this) closeEditAddRoom()">
      <div class="edit-add-room-card">
        <h3 id="editAddRoomTitle">Add a room to your booking page</h3>
        <p>You can add photos, pricing and details as soon as the room is created.</p>
        <input type="text" id="editNewRoomName" placeholder="Room name, like King Suite" autocomplete="off" onkeydown="if(event.key==='Enter') confirmEditAddRoom(); if(event.key==='Escape') closeEditAddRoom();">
        <div class="edit-add-room-actions">
          <button type="button" onclick="closeEditAddRoom()">Cancel</button>
          <button type="button" class="primary" onclick="confirmEditAddRoom()">Add room</button>
        </div>
      </div>
    </div>
  `),window.setNativeModalOpen?.("edit-add-room",!0),requestAnimationFrame(()=>document.getElementById("editNewRoomName")?.focus()))}function ot(){document.getElementById("editAddRoomModal")?.remove(),window.setNativeModalOpen?.("edit-add-room",!1)}async function Go(){const e=document.getElementById("editNewRoomName"),t=document.querySelector("#editAddRoomModal .edit-add-room-actions .primary"),o=e?.value.trim()||"";if(!o)return;e&&(e.disabled=!0),t&&(t.disabled=!0,t.textContent="Adding…");const i=5;try{const n=await api("POST","/api/crm/rooms",{name:o,maxOccupancy:4,totalUnits:i});if(!n?.success||!n.room?.id)throw new Error(n?.message||"Failed to add room");const r={id:n.room.id,name:n.room.name||o,description:"",amenities:"",maxOccupancy:4,totalUnits:i,imageUrl:null,images:[]},a=d.editRooms.findIndex(g=>g.id===r.id);a>=0?d.editRooms=d.editRooms.map((g,x)=>x===a?r:g):d.editRooms=[...d.editRooms,r];const s=d.manualAvailability||{rooms:[],overrides:{}};Array.isArray(s.rooms)||(s.rooms=[]),(!s.overrides||typeof s.overrides!="object")&&(s.overrides={}),s.rooms.some(g=>g.name===r.name)||(s.rooms=[...s.rooms,{name:r.name,totalUnits:i}].sort((g,x)=>String(g.name).localeCompare(String(x.name)))),d.manualAvailability=s,d.manualSelectedRoom||(d.manualSelectedRoom=r.name),ot(),N(),window.refreshRoomBadge?.(),toast("Room added","success"),Ae({render:!0}).catch(()=>{}),window.loadManualAvailability?.({silent:!0})?.catch(()=>{})}catch(n){e&&(e.disabled=!1),t&&(t.disabled=!1,t.textContent="Add room"),toast(n.message||"Failed to add room","error")}}const it={addAmenityPrompt:To,advanceTourIfNeeded:X,changePin:Po,checklistGoTo:go,checklistGoToRates:po,cleanupPostActivationTourUi:le,cleanupSettingsTourUi:H,cancelAccountDeletion:$o,closeAmenityPicker:ce,closeEditAddRoom:ot,confirmAmenityPicker:Ao,confirmEditAddRoom:Go,copyBookingLink:Mo,copyBookingLinkFromChecklist:uo,deleteEditImage:jo,deleteEditRoom:Uo,ensureTourBlurOverlay:L,finishPostActivationTour:ie,getAmenityIcon:Ke,getCrmAuthToken:Ee,getEditRoomImages:We,goLive:be,guestBookingEngineUrl:Ge,handoffToGuestAppsTour:He,hideGoLiveOverlay:ve,loadEditRooms:Eo,loadSettings:Ue,openAmenityPicker:Ze,openBillingPortal:Lo,openEditAddRoom:Vo,openGuestBookingEngine:yo,openPreviewSite:Ve,openTourAccordion:G,postRoomImageUpload:Se,queryTourSelector:j,requestAccountDeletion:Do,removeAmenity:zo,renderEditRooms:Be,renderEditRoomsCards:N,refreshEditRoomsData:Ae,replayWalkthrough:wo,resolveLiveTourElement:oe,resolveTourHighlightEl:J,restoreAppIconPreview:we,saveEditRoom:Ho,saveHotelInfo:Io,saveRates:Co,selectPageUtility:Ro,scrollTourTargetIntoView:Fe,sendSupportMessage:Fo,setAppIconPreviewImage:ze,setAppIconPreviewLoading:tt,settingsChangePin:ho,settingsCopyLink:co,settingsSaveRates:fo,settingsSendSupport:xo,settingsUploadPhoto:mo,showActivatedModal:ko,showEditRoomPhoto:Je,showFinaleMockModal:K,showGoLiveOverlay:Xe,showOnboardingQuestions:bo,showTestDriveModal:Ne,showWelcomeModal:_e,squareCropImage:et,startPostActivationTabTour:Ye,startSettingsTour:xe,stepEditRoomPhoto:So,toggleAmenityPreset:Bo,toggleSection:Oo,tourAnchorRect:$e,tourElementRect:se,updatePreviewSiteBar:vo,uploadAppIcon:qo,uploadEditImages:No};function _o(){Ft(it)}const Ko=Object.freeze(Object.defineProperty({__proto__:null,default:it,install:_o},Symbol.toStringTag,{value:"Module"}));export{eo as a,Xt as b,d as c,Yo as d,Ft as e,Ko as f,Jo as i,Wo as s};
