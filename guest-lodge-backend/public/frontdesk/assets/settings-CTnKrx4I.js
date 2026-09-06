const g={token:"",isMasterPin:!1,isDogfoodPreview:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDayOriginal:null,availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,marketelSubscriptionStatus:"",marketelSubscriptionPeriodEnd:"",marketelTrialEligible:!0,marketelTrialDays:14,trialStatus:null,operationalAccessOnly:!1,frontdeskAppStoreUrl:"",revenuePeriod:"30d",revenueCustomStart:"",revenueCustomEnd:"",revenueCache:{},revenueLoading:!1,revenueError:"",revenueRequestId:0,blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",assistantData:null,assistantLoading:!1,assistantError:"",supportThread:null,supportUnreadCount:0,launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all","custom"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",guestelWalletImageUrl:"",guestelWalletFallbackImageUrl:"",guestelWalletSubtitle:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,frontdeskInstallReported:!1,nativeNotificationState:"",guestPushSubscriberCount:0,bookingReviewSettings:{reminderMinutes:15,maxReminders:3},bookingConflicts:[],operationalReadiness:null,operationalReadinessLoading:!1,_magicLoginPending:!1,editRooms:[],editRates:null,editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesExpanded:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",messagesWorkspaceThreadOpen:!1,bookingsVirtualList:[],bookingsVirtualRaf:0};function $e(e){const t=e.trialStatus||e.marketelLatestTrialState||{},i=e.marketelSubscriptionStatus==="trialing"||t.trialing===!0,o=t.endsAt||e.marketelSubscriptionPeriodEnd,n=o?new Date(o):null,r=n&&Number.isFinite(n.getTime())?new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(n):"",a=Number(t.renewalAmountUsd),s=["month","year"].includes(t.billingInterval)?t.billingInterval:"",d=a>0&&s?`$${a.toLocaleString("en-US")}/${s}`:"",c=t.daysLeft!=null&&Number.isFinite(Number(t.daysLeft))?Math.max(0,Number(t.daysLeft)):null,f=t.cancellationScheduled===!0,y=!e.hotelSubscribed&&!i&&!!(t.canceledAt||t.startedAt);return{trialing:i,canceled:f,ended:y,daysLeft:c,endLabel:r,price:d,title:i?f?"Your trial cancellation is scheduled":`Your ${e.marketelTrialDays||14}-day trial has started`:e.hotelSubscribed?"Your Marketel access is active":y?"Your trial access has ended":"Confirming your trial…",billing:i?f?`No subscription charge is scheduled. ${r?`Access continues through ${r}.`:"Your access-end date is loading."}`:d&&r?`Automatically renews at ${d} on ${r} unless you cancel before then.`:"Your billing details are loading. Check Trial & Billing for your renewal amount and date.":e.hotelSubscribed?"Manage your subscription in Trial & Billing.":y?"New direct bookings are paused. Your existing reservations and guest messages remain available.":"We are checking your subscription status. Your property setup is saved."}}function Do(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var oe={},Fe,At;function $o(){return At||(At=1,Fe=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),Fe}var Oe={},V={},Ct;function Q(){if(Ct)return V;Ct=1;let e;const t=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return V.getSymbolSize=function(o){if(!o)throw new Error('"version" cannot be null or undefined');if(o<1||o>40)throw new Error('"version" should be in range from 1 to 40');return o*4+17},V.getSymbolTotalCodewords=function(o){return t[o]},V.getBCHDigit=function(i){let o=0;for(;i!==0;)o++,i>>>=1;return o},V.setToSJISFunction=function(o){if(typeof o!="function")throw new Error('"toSJISFunc" is not a valid function.');e=o},V.isKanjiModeEnabled=function(){return typeof e<"u"},V.toSJIS=function(o){return e(o)},V}var Ne={},Tt;function ft(){return Tt||(Tt=1,(function(e){e.L={bit:1},e.M={bit:0},e.Q={bit:3},e.H={bit:2};function t(i){if(typeof i!="string")throw new Error("Param is not a string");switch(i.toLowerCase()){case"l":case"low":return e.L;case"m":case"medium":return e.M;case"q":case"quartile":return e.Q;case"h":case"high":return e.H;default:throw new Error("Unknown EC Level: "+i)}}e.isValid=function(o){return o&&typeof o.bit<"u"&&o.bit>=0&&o.bit<4},e.from=function(o,n){if(e.isValid(o))return o;try{return t(o)}catch{return n}}})(Ne)),Ne}var qe,It;function Fo(){if(It)return qe;It=1;function e(){this.buffer=[],this.length=0}return e.prototype={get:function(t){const i=Math.floor(t/8);return(this.buffer[i]>>>7-t%8&1)===1},put:function(t,i){for(let o=0;o<i;o++)this.putBit((t>>>i-o-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(t){const i=Math.floor(this.length/8);this.buffer.length<=i&&this.buffer.push(0),t&&(this.buffer[i]|=128>>>this.length%8),this.length++}},qe=e,qe}var He,Mt;function Oo(){if(Mt)return He;Mt=1;function e(t){if(!t||t<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=t,this.data=new Uint8Array(t*t),this.reservedBit=new Uint8Array(t*t)}return e.prototype.set=function(t,i,o,n){const r=t*this.size+i;this.data[r]=o,n&&(this.reservedBit[r]=!0)},e.prototype.get=function(t,i){return this.data[t*this.size+i]},e.prototype.xor=function(t,i,o){this.data[t*this.size+i]^=o},e.prototype.isReserved=function(t,i){return this.reservedBit[t*this.size+i]},He=e,He}var Ue={},Pt;function No(){return Pt||(Pt=1,(function(e){const t=Q().getSymbolSize;e.getRowColCoords=function(o){if(o===1)return[];const n=Math.floor(o/7)+2,r=t(o),a=r===145?26:Math.ceil((r-13)/(2*n-2))*2,s=[r-7];for(let d=1;d<n-1;d++)s[d]=s[d-1]-a;return s.push(6),s.reverse()},e.getPositions=function(o){const n=[],r=e.getRowColCoords(o),a=r.length;for(let s=0;s<a;s++)for(let d=0;d<a;d++)s===0&&d===0||s===0&&d===a-1||s===a-1&&d===0||n.push([r[s],r[d]]);return n}})(Ue)),Ue}var je={},Rt;function qo(){if(Rt)return je;Rt=1;const e=Q().getSymbolSize,t=7;return je.getPositions=function(o){const n=e(o);return[[0,0],[n-t,0],[0,n-t]]},je}var _e={},zt;function Ho(){return zt||(zt=1,(function(e){e.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};e.isValid=function(n){return n!=null&&n!==""&&!isNaN(n)&&n>=0&&n<=7},e.from=function(n){return e.isValid(n)?parseInt(n,10):void 0},e.getPenaltyN1=function(n){const r=n.size;let a=0,s=0,d=0,c=null,f=null;for(let y=0;y<r;y++){s=d=0,c=f=null;for(let k=0;k<r;k++){let E=n.get(y,k);E===c?s++:(s>=5&&(a+=t.N1+(s-5)),c=E,s=1),E=n.get(k,y),E===f?d++:(d>=5&&(a+=t.N1+(d-5)),f=E,d=1)}s>=5&&(a+=t.N1+(s-5)),d>=5&&(a+=t.N1+(d-5))}return a},e.getPenaltyN2=function(n){const r=n.size;let a=0;for(let s=0;s<r-1;s++)for(let d=0;d<r-1;d++){const c=n.get(s,d)+n.get(s,d+1)+n.get(s+1,d)+n.get(s+1,d+1);(c===4||c===0)&&a++}return a*t.N2},e.getPenaltyN3=function(n){const r=n.size;let a=0,s=0,d=0;for(let c=0;c<r;c++){s=d=0;for(let f=0;f<r;f++)s=s<<1&2047|n.get(c,f),f>=10&&(s===1488||s===93)&&a++,d=d<<1&2047|n.get(f,c),f>=10&&(d===1488||d===93)&&a++}return a*t.N3},e.getPenaltyN4=function(n){let r=0;const a=n.data.length;for(let d=0;d<a;d++)r+=n.data[d];return Math.abs(Math.ceil(r*100/a/5)-10)*t.N4};function i(o,n,r){switch(o){case e.Patterns.PATTERN000:return(n+r)%2===0;case e.Patterns.PATTERN001:return n%2===0;case e.Patterns.PATTERN010:return r%3===0;case e.Patterns.PATTERN011:return(n+r)%3===0;case e.Patterns.PATTERN100:return(Math.floor(n/2)+Math.floor(r/3))%2===0;case e.Patterns.PATTERN101:return n*r%2+n*r%3===0;case e.Patterns.PATTERN110:return(n*r%2+n*r%3)%2===0;case e.Patterns.PATTERN111:return(n*r%3+(n+r)%2)%2===0;default:throw new Error("bad maskPattern:"+o)}}e.applyMask=function(n,r){const a=r.size;for(let s=0;s<a;s++)for(let d=0;d<a;d++)r.isReserved(d,s)||r.xor(d,s,i(n,d,s))},e.getBestMask=function(n,r){const a=Object.keys(e.Patterns).length;let s=0,d=1/0;for(let c=0;c<a;c++){r(c),e.applyMask(c,n);const f=e.getPenaltyN1(n)+e.getPenaltyN2(n)+e.getPenaltyN3(n)+e.getPenaltyN4(n);e.applyMask(c,n),f<d&&(d=f,s=c)}return s}})(_e)),_e}var he={},Lt;function ro(){if(Lt)return he;Lt=1;const e=ft(),t=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return he.getBlocksCount=function(n,r){switch(r){case e.L:return t[(n-1)*4+0];case e.M:return t[(n-1)*4+1];case e.Q:return t[(n-1)*4+2];case e.H:return t[(n-1)*4+3];default:return}},he.getTotalCodewordsCount=function(n,r){switch(r){case e.L:return i[(n-1)*4+0];case e.M:return i[(n-1)*4+1];case e.Q:return i[(n-1)*4+2];case e.H:return i[(n-1)*4+3];default:return}},he}var Ve={},se={},Dt;function Uo(){if(Dt)return se;Dt=1;const e=new Uint8Array(512),t=new Uint8Array(256);return(function(){let o=1;for(let n=0;n<255;n++)e[n]=o,t[o]=n,o<<=1,o&256&&(o^=285);for(let n=255;n<512;n++)e[n]=e[n-255]})(),se.log=function(o){if(o<1)throw new Error("log("+o+")");return t[o]},se.exp=function(o){return e[o]},se.mul=function(o,n){return o===0||n===0?0:e[t[o]+t[n]]},se}var $t;function jo(){return $t||($t=1,(function(e){const t=Uo();e.mul=function(o,n){const r=new Uint8Array(o.length+n.length-1);for(let a=0;a<o.length;a++)for(let s=0;s<n.length;s++)r[a+s]^=t.mul(o[a],n[s]);return r},e.mod=function(o,n){let r=new Uint8Array(o);for(;r.length-n.length>=0;){const a=r[0];for(let d=0;d<n.length;d++)r[d]^=t.mul(n[d],a);let s=0;for(;s<r.length&&r[s]===0;)s++;r=r.slice(s)}return r},e.generateECPolynomial=function(o){let n=new Uint8Array([1]);for(let r=0;r<o;r++)n=e.mul(n,new Uint8Array([1,t.exp(r)]));return n}})(Ve)),Ve}var Ye,Ft;function _o(){if(Ft)return Ye;Ft=1;const e=jo();function t(i){this.genPoly=void 0,this.degree=i,this.degree&&this.initialize(this.degree)}return t.prototype.initialize=function(o){this.degree=o,this.genPoly=e.generateECPolynomial(this.degree)},t.prototype.encode=function(o){if(!this.genPoly)throw new Error("Encoder not initialized");const n=new Uint8Array(o.length+this.degree);n.set(o);const r=e.mod(n,this.genPoly),a=this.degree-r.length;if(a>0){const s=new Uint8Array(this.degree);return s.set(r,a),s}return r},Ye=t,Ye}var Ge={},We={},Ke={},Ot;function ao(){return Ot||(Ot=1,Ke.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40}),Ke}var O={},Nt;function so(){if(Nt)return O;Nt=1;const e="[0-9]+",t="[A-Z $%*+\\-./:]+";let i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";i=i.replace(/u/g,"\\u");const o="(?:(?![A-Z0-9 $%*+\\-./:]|"+i+`)(?:.|[\r
]))+`;O.KANJI=new RegExp(i,"g"),O.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),O.BYTE=new RegExp(o,"g"),O.NUMERIC=new RegExp(e,"g"),O.ALPHANUMERIC=new RegExp(t,"g");const n=new RegExp("^"+i+"$"),r=new RegExp("^"+e+"$"),a=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return O.testKanji=function(d){return n.test(d)},O.testNumeric=function(d){return r.test(d)},O.testAlphanumeric=function(d){return a.test(d)},O}var qt;function Z(){return qt||(qt=1,(function(e){const t=ao(),i=so();e.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},e.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},e.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},e.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},e.MIXED={bit:-1},e.getCharCountIndicator=function(r,a){if(!r.ccBits)throw new Error("Invalid mode: "+r);if(!t.isValid(a))throw new Error("Invalid version: "+a);return a>=1&&a<10?r.ccBits[0]:a<27?r.ccBits[1]:r.ccBits[2]},e.getBestModeForData=function(r){return i.testNumeric(r)?e.NUMERIC:i.testAlphanumeric(r)?e.ALPHANUMERIC:i.testKanji(r)?e.KANJI:e.BYTE},e.toString=function(r){if(r&&r.id)return r.id;throw new Error("Invalid mode")},e.isValid=function(r){return r&&r.bit&&r.ccBits};function o(n){if(typeof n!="string")throw new Error("Param is not a string");switch(n.toLowerCase()){case"numeric":return e.NUMERIC;case"alphanumeric":return e.ALPHANUMERIC;case"kanji":return e.KANJI;case"byte":return e.BYTE;default:throw new Error("Unknown mode: "+n)}}e.from=function(r,a){if(e.isValid(r))return r;try{return o(r)}catch{return a}}})(We)),We}var Ht;function Vo(){return Ht||(Ht=1,(function(e){const t=Q(),i=ro(),o=ft(),n=Z(),r=ao(),a=7973,s=t.getBCHDigit(a);function d(k,E,M){for(let P=1;P<=40;P++)if(E<=e.getCapacity(P,M,k))return P}function c(k,E){return n.getCharCountIndicator(k,E)+4}function f(k,E){let M=0;return k.forEach(function(P){const h=c(P.mode,E);M+=h+P.getBitsLength()}),M}function y(k,E){for(let M=1;M<=40;M++)if(f(k,M)<=e.getCapacity(M,E,n.MIXED))return M}e.from=function(E,M){return r.isValid(E)?parseInt(E,10):M},e.getCapacity=function(E,M,P){if(!r.isValid(E))throw new Error("Invalid QR Code version");typeof P>"u"&&(P=n.BYTE);const h=t.getSymbolTotalCodewords(E),l=i.getTotalCodewordsCount(E,M),u=(h-l)*8;if(P===n.MIXED)return u;const x=u-c(P,E);switch(P){case n.NUMERIC:return Math.floor(x/10*3);case n.ALPHANUMERIC:return Math.floor(x/11*2);case n.KANJI:return Math.floor(x/13);case n.BYTE:default:return Math.floor(x/8)}},e.getBestVersionForData=function(E,M){let P;const h=o.from(M,o.M);if(Array.isArray(E)){if(E.length>1)return y(E,h);if(E.length===0)return 1;P=E[0]}else P=E;return d(P.mode,P.getLength(),h)},e.getEncodedBits=function(E){if(!r.isValid(E)||E<7)throw new Error("Invalid QR Code version");let M=E<<12;for(;t.getBCHDigit(M)-s>=0;)M^=a<<t.getBCHDigit(M)-s;return E<<12|M}})(Ge)),Ge}var Je={},Ut;function Yo(){if(Ut)return Je;Ut=1;const e=Q(),t=1335,i=21522,o=e.getBCHDigit(t);return Je.getEncodedBits=function(r,a){const s=r.bit<<3|a;let d=s<<10;for(;e.getBCHDigit(d)-o>=0;)d^=t<<e.getBCHDigit(d)-o;return(s<<10|d)^i},Je}var Qe={},Ze,jt;function Go(){if(jt)return Ze;jt=1;const e=Z();function t(i){this.mode=e.NUMERIC,this.data=i.toString()}return t.getBitsLength=function(o){return 10*Math.floor(o/3)+(o%3?o%3*3+1:0)},t.prototype.getLength=function(){return this.data.length},t.prototype.getBitsLength=function(){return t.getBitsLength(this.data.length)},t.prototype.write=function(o){let n,r,a;for(n=0;n+3<=this.data.length;n+=3)r=this.data.substr(n,3),a=parseInt(r,10),o.put(a,10);const s=this.data.length-n;s>0&&(r=this.data.substr(n),a=parseInt(r,10),o.put(a,s*3+1))},Ze=t,Ze}var Xe,_t;function Wo(){if(_t)return Xe;_t=1;const e=Z(),t=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function i(o){this.mode=e.ALPHANUMERIC,this.data=o}return i.getBitsLength=function(n){return 11*Math.floor(n/2)+6*(n%2)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(n){let r;for(r=0;r+2<=this.data.length;r+=2){let a=t.indexOf(this.data[r])*45;a+=t.indexOf(this.data[r+1]),n.put(a,11)}this.data.length%2&&n.put(t.indexOf(this.data[r]),6)},Xe=i,Xe}var et,Vt;function Ko(){if(Vt)return et;Vt=1;const e=Z();function t(i){this.mode=e.BYTE,typeof i=="string"?this.data=new TextEncoder().encode(i):this.data=new Uint8Array(i)}return t.getBitsLength=function(o){return o*8},t.prototype.getLength=function(){return this.data.length},t.prototype.getBitsLength=function(){return t.getBitsLength(this.data.length)},t.prototype.write=function(i){for(let o=0,n=this.data.length;o<n;o++)i.put(this.data[o],8)},et=t,et}var tt,Yt;function Jo(){if(Yt)return tt;Yt=1;const e=Z(),t=Q();function i(o){this.mode=e.KANJI,this.data=o}return i.getBitsLength=function(n){return n*13},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(o){let n;for(n=0;n<this.data.length;n++){let r=t.toSJIS(this.data[n]);if(r>=33088&&r<=40956)r-=33088;else if(r>=57408&&r<=60351)r-=49472;else throw new Error("Invalid SJIS character: "+this.data[n]+`
Make sure your charset is UTF-8`);r=(r>>>8&255)*192+(r&255),o.put(r,13)}},tt=i,tt}var ot={exports:{}},Gt;function Qo(){return Gt||(Gt=1,(function(e){var t={single_source_shortest_paths:function(i,o,n){var r={},a={};a[o]=0;var s=t.PriorityQueue.make();s.push(o,0);for(var d,c,f,y,k,E,M,P,h;!s.empty();){d=s.pop(),c=d.value,y=d.cost,k=i[c]||{};for(f in k)k.hasOwnProperty(f)&&(E=k[f],M=y+E,P=a[f],h=typeof a[f]>"u",(h||P>M)&&(a[f]=M,s.push(f,M),r[f]=c))}if(typeof n<"u"&&typeof a[n]>"u"){var l=["Could not find a path from ",o," to ",n,"."].join("");throw new Error(l)}return r},extract_shortest_path_from_predecessor_list:function(i,o){for(var n=[],r=o;r;)n.push(r),i[r],r=i[r];return n.reverse(),n},find_path:function(i,o,n){var r=t.single_source_shortest_paths(i,o,n);return t.extract_shortest_path_from_predecessor_list(r,n)},PriorityQueue:{make:function(i){var o=t.PriorityQueue,n={},r;i=i||{};for(r in o)o.hasOwnProperty(r)&&(n[r]=o[r]);return n.queue=[],n.sorter=i.sorter||o.default_sorter,n},default_sorter:function(i,o){return i.cost-o.cost},push:function(i,o){var n={value:i,cost:o};this.queue.push(n),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};e.exports=t})(ot)),ot.exports}var Wt;function Zo(){return Wt||(Wt=1,(function(e){const t=Z(),i=Go(),o=Wo(),n=Ko(),r=Jo(),a=so(),s=Q(),d=Qo();function c(l){return unescape(encodeURIComponent(l)).length}function f(l,u,x){const p=[];let B;for(;(B=l.exec(x))!==null;)p.push({data:B[0],index:B.index,mode:u,length:B[0].length});return p}function y(l){const u=f(a.NUMERIC,t.NUMERIC,l),x=f(a.ALPHANUMERIC,t.ALPHANUMERIC,l);let p,B;return s.isKanjiModeEnabled()?(p=f(a.BYTE,t.BYTE,l),B=f(a.KANJI,t.KANJI,l)):(p=f(a.BYTE_KANJI,t.BYTE,l),B=[]),u.concat(x,p,B).sort(function(v,b){return v.index-b.index}).map(function(v){return{data:v.data,mode:v.mode,length:v.length}})}function k(l,u){switch(u){case t.NUMERIC:return i.getBitsLength(l);case t.ALPHANUMERIC:return o.getBitsLength(l);case t.KANJI:return r.getBitsLength(l);case t.BYTE:return n.getBitsLength(l)}}function E(l){return l.reduce(function(u,x){const p=u.length-1>=0?u[u.length-1]:null;return p&&p.mode===x.mode?(u[u.length-1].data+=x.data,u):(u.push(x),u)},[])}function M(l){const u=[];for(let x=0;x<l.length;x++){const p=l[x];switch(p.mode){case t.NUMERIC:u.push([p,{data:p.data,mode:t.ALPHANUMERIC,length:p.length},{data:p.data,mode:t.BYTE,length:p.length}]);break;case t.ALPHANUMERIC:u.push([p,{data:p.data,mode:t.BYTE,length:p.length}]);break;case t.KANJI:u.push([p,{data:p.data,mode:t.BYTE,length:c(p.data)}]);break;case t.BYTE:u.push([{data:p.data,mode:t.BYTE,length:c(p.data)}])}}return u}function P(l,u){const x={},p={start:{}};let B=["start"];for(let m=0;m<l.length;m++){const v=l[m],b=[];for(let w=0;w<v.length;w++){const S=v[w],C=""+m+w;b.push(C),x[C]={node:S,lastCount:0},p[C]={};for(let A=0;A<B.length;A++){const T=B[A];x[T]&&x[T].node.mode===S.mode?(p[T][C]=k(x[T].lastCount+S.length,S.mode)-k(x[T].lastCount,S.mode),x[T].lastCount+=S.length):(x[T]&&(x[T].lastCount=S.length),p[T][C]=k(S.length,S.mode)+4+t.getCharCountIndicator(S.mode,u))}}B=b}for(let m=0;m<B.length;m++)p[B[m]].end=0;return{map:p,table:x}}function h(l,u){let x;const p=t.getBestModeForData(l);if(x=t.from(u,p),x!==t.BYTE&&x.bit<p.bit)throw new Error('"'+l+'" cannot be encoded with mode '+t.toString(x)+`.
 Suggested mode is: `+t.toString(p));switch(x===t.KANJI&&!s.isKanjiModeEnabled()&&(x=t.BYTE),x){case t.NUMERIC:return new i(l);case t.ALPHANUMERIC:return new o(l);case t.KANJI:return new r(l);case t.BYTE:return new n(l)}}e.fromArray=function(u){return u.reduce(function(x,p){return typeof p=="string"?x.push(h(p,null)):p.data&&x.push(h(p.data,p.mode)),x},[])},e.fromString=function(u,x){const p=y(u,s.isKanjiModeEnabled()),B=M(p),m=P(B,x),v=d.find_path(m.map,"start","end"),b=[];for(let w=1;w<v.length-1;w++)b.push(m.table[v[w]].node);return e.fromArray(E(b))},e.rawSplit=function(u){return e.fromArray(y(u,s.isKanjiModeEnabled()))}})(Qe)),Qe}var Kt;function Xo(){if(Kt)return Oe;Kt=1;const e=Q(),t=ft(),i=Fo(),o=Oo(),n=No(),r=qo(),a=Ho(),s=ro(),d=_o(),c=Vo(),f=Yo(),y=Z(),k=Zo();function E(m,v){const b=m.size,w=r.getPositions(v);for(let S=0;S<w.length;S++){const C=w[S][0],A=w[S][1];for(let T=-1;T<=7;T++)if(!(C+T<=-1||b<=C+T))for(let I=-1;I<=7;I++)A+I<=-1||b<=A+I||(T>=0&&T<=6&&(I===0||I===6)||I>=0&&I<=6&&(T===0||T===6)||T>=2&&T<=4&&I>=2&&I<=4?m.set(C+T,A+I,!0,!0):m.set(C+T,A+I,!1,!0))}}function M(m){const v=m.size;for(let b=8;b<v-8;b++){const w=b%2===0;m.set(b,6,w,!0),m.set(6,b,w,!0)}}function P(m,v){const b=n.getPositions(v);for(let w=0;w<b.length;w++){const S=b[w][0],C=b[w][1];for(let A=-2;A<=2;A++)for(let T=-2;T<=2;T++)A===-2||A===2||T===-2||T===2||A===0&&T===0?m.set(S+A,C+T,!0,!0):m.set(S+A,C+T,!1,!0)}}function h(m,v){const b=m.size,w=c.getEncodedBits(v);let S,C,A;for(let T=0;T<18;T++)S=Math.floor(T/3),C=T%3+b-8-3,A=(w>>T&1)===1,m.set(S,C,A,!0),m.set(C,S,A,!0)}function l(m,v,b){const w=m.size,S=f.getEncodedBits(v,b);let C,A;for(C=0;C<15;C++)A=(S>>C&1)===1,C<6?m.set(C,8,A,!0):C<8?m.set(C+1,8,A,!0):m.set(w-15+C,8,A,!0),C<8?m.set(8,w-C-1,A,!0):C<9?m.set(8,15-C-1+1,A,!0):m.set(8,15-C-1,A,!0);m.set(w-8,8,1,!0)}function u(m,v){const b=m.size;let w=-1,S=b-1,C=7,A=0;for(let T=b-1;T>0;T-=2)for(T===6&&T--;;){for(let I=0;I<2;I++)if(!m.isReserved(S,T-I)){let L=!1;A<v.length&&(L=(v[A]>>>C&1)===1),m.set(S,T-I,L),C--,C===-1&&(A++,C=7)}if(S+=w,S<0||b<=S){S-=w,w=-w;break}}}function x(m,v,b){const w=new i;b.forEach(function(I){w.put(I.mode.bit,4),w.put(I.getLength(),y.getCharCountIndicator(I.mode,m)),I.write(w)});const S=e.getSymbolTotalCodewords(m),C=s.getTotalCodewordsCount(m,v),A=(S-C)*8;for(w.getLengthInBits()+4<=A&&w.put(0,4);w.getLengthInBits()%8!==0;)w.putBit(0);const T=(A-w.getLengthInBits())/8;for(let I=0;I<T;I++)w.put(I%2?17:236,8);return p(w,m,v)}function p(m,v,b){const w=e.getSymbolTotalCodewords(v),S=s.getTotalCodewordsCount(v,b),C=w-S,A=s.getBlocksCount(v,b),T=w%A,I=A-T,L=Math.floor(w/A),z=Math.floor(C/A),$=z+1,_=L-z,fe=new d(_);let ee=0;const me=new Array(A),St=new Array(A);let ze=0;const Lo=new Uint8Array(m.buffer);for(let te=0;te<A;te++){const De=te<I?z:$;me[te]=Lo.slice(ee,ee+De),St[te]=fe.encode(me[te]),ee+=De,ze=Math.max(ze,De)}const Le=new Uint8Array(w);let Bt=0,U,j;for(U=0;U<ze;U++)for(j=0;j<A;j++)U<me[j].length&&(Le[Bt++]=me[j][U]);for(U=0;U<_;U++)for(j=0;j<A;j++)Le[Bt++]=St[j][U];return Le}function B(m,v,b,w){let S;if(Array.isArray(m))S=k.fromArray(m);else if(typeof m=="string"){let L=v;if(!L){const z=k.rawSplit(m);L=c.getBestVersionForData(z,b)}S=k.fromString(m,L||40)}else throw new Error("Invalid data");const C=c.getBestVersionForData(S,b);if(!C)throw new Error("The amount of data is too big to be stored in a QR Code");if(!v)v=C;else if(v<C)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+C+`.
`);const A=x(v,b,S),T=e.getSymbolSize(v),I=new o(T);return E(I,v),M(I),P(I,v),l(I,b,0),v>=7&&h(I,v),u(I,A),isNaN(w)&&(w=a.getBestMask(I,l.bind(null,I,b))),a.applyMask(w,I),l(I,b,w),{modules:I,version:v,errorCorrectionLevel:b,maskPattern:w,segments:S}}return Oe.create=function(v,b){if(typeof v>"u"||v==="")throw new Error("No input text");let w=t.M,S,C;return typeof b<"u"&&(w=t.from(b.errorCorrectionLevel,t.M),S=c.from(b.version),C=a.from(b.maskPattern),b.toSJISFunc&&e.setToSJISFunction(b.toSJISFunc)),B(v,S,w,C)},Oe}var it={},nt={},Jt;function lo(){return Jt||(Jt=1,(function(e){function t(i){if(typeof i=="number"&&(i=i.toString()),typeof i!="string")throw new Error("Color should be defined as hex string");let o=i.slice().replace("#","").split("");if(o.length<3||o.length===5||o.length>8)throw new Error("Invalid hex color: "+i);(o.length===3||o.length===4)&&(o=Array.prototype.concat.apply([],o.map(function(r){return[r,r]}))),o.length===6&&o.push("F","F");const n=parseInt(o.join(""),16);return{r:n>>24&255,g:n>>16&255,b:n>>8&255,a:n&255,hex:"#"+o.slice(0,6).join("")}}e.getOptions=function(o){o||(o={}),o.color||(o.color={});const n=typeof o.margin>"u"||o.margin===null||o.margin<0?4:o.margin,r=o.width&&o.width>=21?o.width:void 0,a=o.scale||4;return{width:r,scale:r?4:a,margin:n,color:{dark:t(o.color.dark||"#000000ff"),light:t(o.color.light||"#ffffffff")},type:o.type,rendererOpts:o.rendererOpts||{}}},e.getScale=function(o,n){return n.width&&n.width>=o+n.margin*2?n.width/(o+n.margin*2):n.scale},e.getImageWidth=function(o,n){const r=e.getScale(o,n);return Math.floor((o+n.margin*2)*r)},e.qrToImageData=function(o,n,r){const a=n.modules.size,s=n.modules.data,d=e.getScale(a,r),c=Math.floor((a+r.margin*2)*d),f=r.margin*d,y=[r.color.light,r.color.dark];for(let k=0;k<c;k++)for(let E=0;E<c;E++){let M=(k*c+E)*4,P=r.color.light;if(k>=f&&E>=f&&k<c-f&&E<c-f){const h=Math.floor((k-f)/d),l=Math.floor((E-f)/d);P=y[s[h*a+l]?1:0]}o[M++]=P.r,o[M++]=P.g,o[M++]=P.b,o[M]=P.a}}})(nt)),nt}var Qt;function ei(){return Qt||(Qt=1,(function(e){const t=lo();function i(n,r,a){n.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=a,r.width=a,r.style.height=a+"px",r.style.width=a+"px"}function o(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}e.render=function(r,a,s){let d=s,c=a;typeof d>"u"&&(!a||!a.getContext)&&(d=a,a=void 0),a||(c=o()),d=t.getOptions(d);const f=t.getImageWidth(r.modules.size,d),y=c.getContext("2d"),k=y.createImageData(f,f);return t.qrToImageData(k.data,r,d),i(y,c,f),y.putImageData(k,0,0),c},e.renderToDataURL=function(r,a,s){let d=s;typeof d>"u"&&(!a||!a.getContext)&&(d=a,a=void 0),d||(d={});const c=e.render(r,a,d),f=d.type||"image/png",y=d.rendererOpts||{};return c.toDataURL(f,y.quality)}})(it)),it}var rt={},Zt;function ti(){if(Zt)return rt;Zt=1;const e=lo();function t(n,r){const a=n.a/255,s=r+'="'+n.hex+'"';return a<1?s+" "+r+'-opacity="'+a.toFixed(2).slice(1)+'"':s}function i(n,r,a){let s=n+r;return typeof a<"u"&&(s+=" "+a),s}function o(n,r,a){let s="",d=0,c=!1,f=0;for(let y=0;y<n.length;y++){const k=Math.floor(y%r),E=Math.floor(y/r);!k&&!c&&(c=!0),n[y]?(f++,y>0&&k>0&&n[y-1]||(s+=c?i("M",k+a,.5+E+a):i("m",d,0),d=0,c=!1),k+1<r&&n[y+1]||(s+=i("h",f),f=0)):d++}return s}return rt.render=function(r,a,s){const d=e.getOptions(a),c=r.modules.size,f=r.modules.data,y=c+d.margin*2,k=d.color.light.a?"<path "+t(d.color.light,"fill")+' d="M0 0h'+y+"v"+y+'H0z"/>':"",E="<path "+t(d.color.dark,"stroke")+' d="'+o(f,c,d.margin)+'"/>',M='viewBox="0 0 '+y+" "+y+'"',h='<svg xmlns="http://www.w3.org/2000/svg" '+(d.width?'width="'+d.width+'" height="'+d.width+'" ':"")+M+' shape-rendering="crispEdges">'+k+E+`</svg>
`;return typeof s=="function"&&s(null,h),h},rt}var Xt;function oi(){if(Xt)return oe;Xt=1;const e=$o(),t=Xo(),i=ei(),o=ti();function n(r,a,s,d,c){const f=[].slice.call(arguments,1),y=f.length,k=typeof f[y-1]=="function";if(!k&&!e())throw new Error("Callback required as last argument");if(k){if(y<2)throw new Error("Too few arguments provided");y===2?(c=s,s=a,a=d=void 0):y===3&&(a.getContext&&typeof c>"u"?(c=d,d=void 0):(c=d,d=s,s=a,a=void 0))}else{if(y<1)throw new Error("Too few arguments provided");return y===1?(s=a,a=d=void 0):y===2&&!a.getContext&&(d=s,s=a,a=void 0),new Promise(function(E,M){try{const P=t.create(s,d);E(r(P,a,d))}catch(P){M(P)}})}try{const E=t.create(s,d);c(null,r(E,a,d))}catch(E){c(E)}}return oe.create=t.create,oe.toCanvas=n.bind(null,i.render),oe.toDataURL=n.bind(null,i.renderToDataURL),oe.toString=n.bind(null,function(r,a,s){return o.render(r,s)}),oe}var ii=oi();const ni=Do(ii);/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=(e,t,i=[])=>{const o=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(t).forEach(n=>{o.setAttribute(n,String(t[n]))}),i.length&&i.forEach(n=>{const r=co(...n);o.appendChild(r)}),o};var ri=([e,t,i])=>co(e,t,i);/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=e=>Array.from(e.attributes).reduce((t,i)=>(t[i.name]=i.value,t),{}),si=e=>typeof e=="string"?e:!e||!e.class?"":e.class&&typeof e.class=="string"?e.class.split(" "):e.class&&Array.isArray(e.class)?e.class:"",di=e=>e.flatMap(si).map(i=>i.trim()).filter(Boolean).filter((i,o,n)=>n.indexOf(i)===o).join(" "),li=e=>e.replace(/(\w)(\w*)(_|-|\s*)/g,(t,i,o)=>i.toUpperCase()+o.toLowerCase()),eo=(e,{nameAttr:t,icons:i,attrs:o})=>{const n=e.getAttribute(t);if(n==null)return;const r=li(n),a=i[r];if(!a)return;const s=ai(e),[d,c,f]=a,y={...c,"data-lucide":n,...o,...s},k=di(["lucide",`lucide-${n}`,s,o]);k&&Object.assign(y,{class:k});const E=ri([d,y,f]);return e.parentNode?.replaceChild(E,e)};/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ci=["svg",R,[["path",{d:"M7 7h10v10"}],["path",{d:"M7 17 17 7"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ui=["svg",R,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m4.9 4.9 14.2 14.2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pi=["svg",R,[["path",{d:"M10 4 8 6"}],["path",{d:"M17 19v2"}],["path",{d:"M2 12h20"}],["path",{d:"M7 19v2"}],["path",{d:"M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gi=["svg",R,[["path",{d:"M2 4v16"}],["path",{d:"M2 8h18a2 2 0 0 1 2 2v10"}],["path",{d:"M2 17h20"}],["path",{d:"M6 8v9"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fi=["svg",R,[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mi=["svg",R,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hi=["svg",R,[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}],["circle",{cx:"12",cy:"13",r:"3"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yi=["svg",R,[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],["circle",{cx:"7",cy:"17",r:"2"}],["path",{d:"M9 17h6"}],["circle",{cx:"17",cy:"17",r:"2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xi=["svg",R,[["path",{d:"M20 6 9 17l-5-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vi=["svg",R,[["path",{d:"m15 18-6-6 6-6"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bi=["svg",R,[["path",{d:"m9 18 6-6-6-6"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=["svg",R,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ki=["svg",R,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ei=["svg",R,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M12 11h4"}],["path",{d:"M12 16h4"}],["path",{d:"M8 11h.01"}],["path",{d:"M8 16h.01"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Si=["svg",R,[["path",{d:"M2 12h20"}],["path",{d:"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{d:"m4 8 16-4"}],["path",{d:"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bi=["svg",R,[["path",{d:"m12 15 2 2 4-4"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ai=["svg",R,[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14"}],["path",{d:"M2 20h3"}],["path",{d:"M13 20h9"}],["path",{d:"M10 12v.01"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ci=["svg",R,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ti=["svg",R,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}],["path",{d:"M2 12h20"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ii=["svg",R,[["line",{x1:"4",x2:"20",y1:"9",y2:"9"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mi=["svg",R,[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pi=["svg",R,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ri=["svg",R,[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zi=["svg",R,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 16v-4"}],["path",{d:"M12 8h.01"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Li=["svg",R,[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Di=["svg",R,[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $i=["svg",R,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fi=["svg",R,[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oi=["svg",R,[["circle",{cx:"11",cy:"4",r:"2"}],["circle",{cx:"18",cy:"8",r:"2"}],["circle",{cx:"20",cy:"16",r:"2"}],["path",{d:"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ni=["svg",R,[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qi=["svg",R,[["polygon",{points:"6 3 20 12 6 21 6 3"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hi=["svg",R,[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3"}],["path",{d:"M21 21v.01"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7"}],["path",{d:"M3 12h.01"}],["path",{d:"M12 3h.01"}],["path",{d:"M12 16v.01"}],["path",{d:"M16 12h1"}],["path",{d:"M21 12v.01"}],["path",{d:"M12 21v-1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=["svg",R,[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ji=["svg",R,[["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["polyline",{points:"16 6 12 2 8 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"15"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=["svg",R,[["path",{d:"M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vi=["svg",R,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12 18h.01"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yi=["svg",R,[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}],["path",{d:"M20 3v4"}],["path",{d:"M22 5h-4"}],["path",{d:"M4 17v2"}],["path",{d:"M5 18H3"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gi=["svg",R,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wi=["svg",R,[["path",{d:"m10 20-1.25-2.5L6 18"}],["path",{d:"M10 4 8.75 6.5 6 6"}],["path",{d:"M10.585 15H10"}],["path",{d:"M2 12h6.5L10 9"}],["path",{d:"M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"}],["path",{d:"m4 10 1.5 2L4 14"}],["path",{d:"m7 21 3-6-1.5-3"}],["path",{d:"m7 3 3 6h2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=["svg",R,[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2"}],["polyline",{points:"17 2 12 7 7 2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=["svg",R,[["path",{d:"M9 14 4 9l5-5"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qi=["svg",R,[["path",{d:"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zi=["svg",R,[["path",{d:"M12 20h.01"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xi=["svg",R,[["path",{d:"M12.8 19.6A2 2 0 1 0 14 16H2"}],["path",{d:"M17.5 8a2.5 2.5 0 1 1 2 4H2"}],["path",{d:"M9.8 4.4A2 2 0 1 1 11 8H2"}]]];/**
 * @license lucide v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const en=({icons:e={},nameAttr:t="data-lucide",attrs:i={}}={})=>{if(!Object.values(e).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof document>"u")throw new Error("`createIcons()` only works in a browser environment.");const o=document.querySelectorAll(`[${t}]`);if(Array.from(o).forEach(n=>eo(n,{nameAttr:t,icons:e,attrs:i})),t==="data-lucide"){const n=document.querySelectorAll("[icon-name]");n.length>0&&Array.from(n).forEach(r=>eo(r,{nameAttr:"icon-name",icons:e,attrs:i}))}},tn={ArrowUpRight:ci,Ban:ui,Bed:gi,Bell:fi,Calendar:mi,Camera:hi,CircleAlert:wi,CircleCheck:ki,ClipboardList:Ei,Hash:Ii,House:Mi,Image:Pi,Info:zi,Lock:Di,MessageCircle:$i,Moon:Fi,Phone:Ni,Play:qi,Undo2:Ji,Bath:pi,Car:yi,Check:xi,ChevronLeft:vi,ChevronRight:bi,CookingPot:Si,CopyCheck:Bi,DoorOpen:Ai,Ellipsis:Ci,Globe:Ti,Inbox:Ri,Laptop:Li,PawPrint:Oi,QrCode:Hi,Rocket:Ui,Share:ji,Shirt:_i,Smartphone:Vi,Sparkles:Yi,SquarePlus:Gi,ThermometerSnowflake:Wi,Tv:Ki,Waves:Qi,Wifi:Zi,Wind:Xi};window.lucide={createIcons(e={}){en({...e,icons:tn})}};function wr(){return Promise.resolve()}async function on(e){if(!e||!e.type.startsWith("image/")||e.type==="image/webp"&&e.size<4e5)return e;try{const t=await createImageBitmap(e),i=1600,o=1200;let n=t.width,r=t.height;const a=Math.min(1,i/n,o/r);n=Math.round(n*a),r=Math.round(r*a);const s=document.createElement("canvas");s.width=n,s.height=r,s.getContext("2d").drawImage(t,0,0,n,r),t.close();const d=await new Promise((f,y)=>{s.toBlob(k=>k?f(k):y(new Error("encode failed")),"image/webp",.82)}),c=(e.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([d],c+".webp",{type:"image/webp"})}catch{return e}}function kr(){const e=()=>{g.currentFilter==="apps"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(e,{timeout:2500}):setTimeout(e,600)}const nn=["cancelled","canceled","released"];function Er(e){return e?nn.includes(String(e.status||"").trim().toLowerCase()):!0}function rn(e){Object.assign(window,e)}const an="/frontdesk/assets/marketel-frontdesk-icon-C0IHqz33.png",ie=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]),sn=e=>`marketelActivationPendingV1.${e}`,de=e=>window.MarketelJourney?.track("JourneyControlActivated",{controlName:`trial-${e}`});function dn(){if(document.getElementById("activatedModalOverlay"))return;const e=g.activeHotelId,t=document.activeElement,i=document.createElement("div");i.id="activatedModalOverlay",i.className="activation-overlay",i.innerHTML='<section class="activation-sheet" role="dialog" aria-modal="true" aria-labelledby="activationTitle" tabindex="-1"></section>';const o=i.firstElementChild;document.documentElement.classList.add("marketel-activation-open"),document.body.appendChild(i);let n=!1,r=!1,a=!1;const s=/Android/i.test(navigator.userAgent),d=!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)&&!(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),c=String(g.frontdeskAppStoreUrl||"").trim(),f=/^https:\/\/apps\.apple\.com\//i.test(c),y=String(g.activeHotelDomain||"").trim().replace(/^https?:\/\//i,"").replace(/\/$/,""),k=y?`https://${y}/`:"",E=()=>{n=!0,i.remove(),document.documentElement.classList.remove("marketel-activation-open");try{(g.hotelSubscribed||$e(g).ended)&&sessionStorage.removeItem(sn(e))}catch{}t?.isConnected&&t.focus()},M=()=>{de("continue-web"),window.finishActivatedReveal?.(),E(),window.setFilter?.("bookings")};i.addEventListener("keydown",l=>{if(l.key==="Escape"&&(l.preventDefault(),M()),l.key!=="Tab")return;const u=[...o.querySelectorAll("button:not(:disabled), a[href]")],x=u[0],p=u.at(-1);if(!x){l.preventDefault();return}l.shiftKey&&(document.activeElement===x||document.activeElement===o)?(l.preventDefault(),p.focus()):!l.shiftKey&&(document.activeElement===p||document.activeElement===o)&&(l.preventDefault(),x.focus())});function P(){if(n||g.activeHotelId!==e){n||E();return}const l=o.contains(document.activeElement)?document.activeElement?.dataset?.activation:null,u=$e(g),x=!!g.hotelSubscribed;o.innerHTML=`
      <div class="activation-success" aria-hidden="true">${x?"✓":"…"}</div>
      <p class="activation-eyebrow">${ie(g.activeHotelName||"Your property")}</p>
      <h1 id="activationTitle">${!x&&!u.ended&&a?"Your trial is not confirmed yet":ie(u.title)}</h1>
      <div class="activation-billing" role="status">
        ${u.trialing?"<strong>$0 charged when your trial started</strong>":""}
        <p>${ie(u.billing)}</p>
        ${x||u.ended?'<button class="activation-link" data-activation="billing">Manage or cancel in Trial &amp; Billing →</button>':""}
      </div>
      ${x?`<p class="activation-status">Your property setup is saved. <strong>${y?"Reservations are enabled.":"Your booking domain is still being checked."}</strong> Review your rooms, rates, availability, and policies before sharing your link.</p>
      ${k?`<a class="activation-booking-link" href="${ie(k)}" target="_blank" rel="noopener">Review ${ie(y)} →</a>`:""}
      <div class="activation-app">
        <div class="activation-app-heading"><img src="${an}" width="64" height="64" alt="Marketel Front Desk app icon"><div><h2>Marketel Front Desk</h2><p>For you and your staff · iPhone app</p></div></div>
        <p>Manage booking requests, availability, and guest messages.</p>
        ${f?`<a class="activation-download${s?" is-secondary":""}" data-activation="download" href="${ie(c)}" target="_blank" rel="noopener">Download on the App Store <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`:"<p>The iPhone app download is not available here yet. Continue in Web Front Desk below.</p>"}
        <p class="activation-signin"><strong>Already set up. Just sign in.</strong> After installing, use the email you used to set up this property and enter the six-digit code sent to your email. Select your property when it appears.</p>
        ${d&&f?'<div class="activation-qr" hidden><img width="112" height="112" alt="QR code for the Marketel Front Desk App Store listing"><span>Scan with your iPhone<br><small>Then sign in with your setup email.</small></span></div>':""}
        ${s?"<p>Use Web Front Desk on this device. Native booking alerts and the no-answer rule are set up in the iPhone app.</p>":""}
      </div>
      <div class="activation-next"><h2>Once you sign in</h2><p>Turn on booking alerts, choose what happens if nobody answers a request, and review your property details. Then check the booking experience and share your link.</p></div>
      <p class="activation-guests">Guests use your booking link. Guestel is their guest experience; Front Desk is your staff app.</p>`:`<p class="activation-status">${u.ended?"Open Front Desk to view existing reservations and manage your subscription.":a?"Confirmation is taking longer than expected. Check again or contact support before trying checkout again.":"Please wait while we confirm access. You can leave this screen and check again from Front Desk."}</p>`}
      <footer class="activation-footer"><button class="activation-web ${!f||s||!x?"is-primary":""}" data-activation="web">Continue in Web Front Desk</button>
      ${!x&&!u.ended||u.trialing&&(!u.price||!u.endLabel)?`<button class="activation-link" data-activation="retry" ${r?"disabled":""}>${r?"Checking…":"Check again"}</button>`:""}
      <a class="activation-support" href="mailto:support@bookmarketel.com">Need help? Contact support</a></footer>`,o.querySelector('[data-activation="web"]').onclick=M,o.querySelector('[data-activation="billing"]')?.addEventListener("click",()=>{de("billing"),window.openMarketelBillingPortal?.()}),o.querySelector('[data-activation="download"]')?.addEventListener("click",()=>de("download")),o.querySelector('[data-activation="retry"]')?.addEventListener("click",()=>{de("check-again"),h()}),l&&o.querySelector(`[data-activation="${l}"]`)?.focus();const p=o.querySelector(".activation-qr");p&&ni.toDataURL(c,{width:224,margin:1}).then(B=>{p.isConnected&&(p.querySelector("img").src=B,p.hidden=!1)}).catch(()=>{})}async function h(){if(!(r||n)){r=!0,a=!1,P();try{for(const l of[0,1e3,2e3,4e3]){if(l&&await new Promise(x=>setTimeout(x,l)),n||g.activeHotelId!==e)return;try{await window.loadMarketelTrialStatus?.()}catch{}if(n)return;P();const u=$e(g);if(u.ended||g.hotelSubscribed&&(!u.trialing||u.price&&u.endLabel))return}a=!0}finally{r=!1,P()}}}P(),o.focus(),de("confirmation-view"),h()}const ln=14,cn=10;function dt(e,t,i){return Math.max(t,Math.min(e,i))}function F(e,t,i,o){return{left:e,top:t,width:i,height:o,right:e+i,bottom:t+o}}function un(){const e=window.visualViewport,t=e?e.offsetLeft:0,i=e?e.offsetTop:0,o=e?e.width:window.innerWidth,n=e?e.height:window.innerHeight;return F(t,i,o,n)}function q(e){if(!e||!e.isConnected)return null;const t=e.getBoundingClientRect();return t.width<2||t.height<2?null:F(t.left,t.top,t.width,t.height)}function pn(e,t){if(!e||!t)return 0;const i=Math.max(0,Math.min(e.right,t.right)-Math.max(e.left,t.left)),o=Math.max(0,Math.min(e.bottom,t.bottom)-Math.max(e.top,t.top));return i*o}function gn(e,t){return Math.max(0,t.left-e.left)+Math.max(0,e.right-t.right)+Math.max(0,t.top-e.top)+Math.max(0,e.bottom-t.bottom)}function fn(e,t){let i=0;for(const o of t||[]){const n=document.querySelector(o);if(!n||getComputedStyle(n).display==="none")continue;const r=q(n);!r||r.bottom<e.bottom-2||r.top>=e.bottom||(i=Math.max(i,e.bottom-r.top))}return i}function mn(e){const t=un(),i=e.margin??ln,o=Math.max(Number(e.bottomInset||0),fn(t,e.avoidBottomSelectors)),n=t.left+i+Number(e.leftInset||0),r=t.top+i+Number(e.topInset||0),a=t.right-i-Number(e.rightInset||0),s=t.bottom-i-o;return F(n,r,Math.max(1,a-n),Math.max(1,s-r))}function hn(e){return e==="above"||e==="top"?["top","bottom","right","left"]:e==="right"?["right","left","bottom","top"]:e==="left"?["left","right","bottom","top"]:["bottom","top","right","left"]}function yn(e,t,i,o,n){return e==="top"?F(t.left+(t.width-i)/2,t.top-o-n,i,o):e==="right"?F(t.right+n,t.top+(t.height-o)/2,i,o):e==="left"?F(t.left-i-n,t.top+(t.height-o)/2,i,o):F(t.left+(t.width-i)/2,t.bottom+n,i,o)}function xn(e,t){const i=dt(e.left,t.left,Math.max(t.left,t.right-e.width)),o=dt(e.top,t.top,Math.max(t.top,t.bottom-e.height));return F(i,o,e.width,e.height)}function vn(e){let t=e&&e.parentElement;for(;t&&t!==document.body&&t!==document.documentElement;){const i=getComputedStyle(t),o=i.overflowY||i.overflow;if(/(auto|scroll)/.test(o)&&t.scrollHeight>t.clientHeight+1)return t;t=t.parentElement}return null}function bn(e,t){if(!e||Math.abs(t)<1)return!1;const i=vn(e);return i?i.scrollTop+=t:window.scrollBy({top:t,left:0,behavior:"auto"}),!0}function at(e,t){const i=q(e);if(!i||t.height<60)return!1;let o;return i.height<=t.height?o=dt(i.top,t.top,t.bottom-i.height):o=t.bottom-i.height,bn(e,i.top-o)}function uo(e,t){const i=getComputedStyle(e);for(const r of i)t.style.setProperty(r,i.getPropertyValue(r),i.getPropertyPriority(r));const o=e.children,n=t.children;for(let r=0;r<o.length;r+=1)n[r]&&uo(o[r],n[r])}function wn(e){e.removeAttribute("id"),e.querySelectorAll("[id]").forEach(t=>t.removeAttribute("id"))}function kn(e,t){const i=e.querySelectorAll("input, textarea, select"),o=t.querySelectorAll("input, textarea, select");i.forEach((n,r)=>{const a=o[r];a&&(n.type==="checkbox"||n.type==="radio"?a.checked=n.checked:a.value=n.value)})}function En(e,t={}){if(!e||!e.isConnected||t.disabled||!q(e))return null;const o=e.cloneNode(!0);wn(o),uo(e,o),kn(e,o),o.setAttribute(t.attribute||"data-adaptive-tour-spotlight","1"),o.setAttribute("aria-hidden","true"),o.style.position="fixed",o.style.margin="0",o.style.maxWidth="none",o.style.zIndex=String(t.zIndex||100002),o.style.pointerEvents="none",o.style.transform="none",t.prepareClone?.(o,e);const n=e.style.visibility;t.hideSource&&(e.style.visibility="hidden"),document.body.appendChild(o);const r=()=>{const s=q(e);return s?(o.style.display="",o.style.left=`${s.left}px`,o.style.top=`${s.top}px`,o.style.width=`${s.width}px`,o.style.height=`${s.height}px`,s):(o.style.display="none",null)},a=()=>{o.remove(),t.hideSource&&(e.style.visibility=n)};return r(),{element:o,source:e,update:r,destroy:a}}function Sn({tooltip:e,panel:t,target:i,anchor:o,spotlight:n,options:r={}}){if(!e||!t||!i)return null;let a=0,s=!1,d=!1,c=!1,f="";const y=(l=!0)=>{if(s||!e.isConnected||!i.isConnected)return null;const u=mn(r),x=`${u.left}:${u.top}:${u.width}:${u.height}`;f&&f!==x&&(d=!1,l=!0),f=x;const p=q(o)||q(i),B=q(i);if(!p||!B)return null;const m=Math.min(Number(r.maxWidth||380),u.width);e.style.position="fixed",e.style.right="auto",e.style.bottom="auto",e.style.width=`${m}px`,e.style.maxWidth=`${m}px`,e.style.margin="0",e.style.justifyContent="flex-start",t.style.maxHeight=`${Math.max(120,u.height)}px`;const v=Math.min(t.offsetHeight||e.offsetHeight||190,u.height),b=Number(r.gap??cn);l&&!d&&r.autoScroll!==!1&&B.height+v+b<=u.height&&(d=at(i,u),d&&requestAnimationFrame(()=>y(!1)));const S=hn(r.preferredPlacement).map((z,$)=>{const _=yn(z,p,m,v,b),fe=gn(_,u),ee=pn(_,B);return{placement:z,index:$,raw:_,overflow:fe,overlap:ee,score:fe*1e5+ee*100+$}}),C=S.find(z=>z.overflow<.5&&z.overlap<1),A=C||S.slice().sort((z,$)=>z.score-$.score)[0],T=r.forceDock===!0||!C;let I="floating",L;if(T){I="docked";const z=Math.min(v,Number(r.dockMaxHeight||Math.max(180,u.height*.42)),u.height);t.style.maxHeight=`${z}px`;const $=Math.min(t.offsetHeight||z,z);if(L=F(u.left+(u.width-m)/2,u.bottom-$,m,$),l&&!d&&r.autoScroll!==!1){const _=F(u.left,u.top,u.width,Math.max(60,L.top-b-u.top));d=at(i,_),d&&requestAnimationFrame(()=>y(!1))}}else if(L=xn(A.raw,u),l&&!d&&r.autoScroll!==!1){let z=u;if(A.placement==="bottom")z=F(u.left,u.top,u.width,Math.max(60,L.top-b-u.top));else if(A.placement==="top"){const $=L.bottom+b;z=F(u.left,$,u.width,Math.max(60,u.bottom-$))}d=at(i,z),d&&requestAnimationFrame(()=>y(!1))}return e.dataset.tourLayoutMode=I,e.dataset.tourPlacement=T?"bottom-dock":A.placement,e.style.left=`${L.left}px`,e.style.top=`${L.top}px`,n?.update?.(),r.onLayout?.({mode:I,placement:e.dataset.tourPlacement,viewport:u,targetRect:q(i),anchorRect:q(o)||q(i),tooltipRect:L}),{mode:I,placement:e.dataset.tourPlacement,rect:L}},k=(l=!1)=>{c=c||l===!0,!(s||a)&&(a=requestAnimationFrame(()=>{a=0;const u=c;c=!1,y(u)}))},E=()=>{d=!1,k(!0)},M=typeof ResizeObserver=="function"?new ResizeObserver(k):null;M?.observe(i),o&&o!==i&&M?.observe(o),M?.observe(t),window.addEventListener("resize",E),window.addEventListener("orientationchange",E),window.addEventListener("scroll",k,!0),window.visualViewport&&(window.visualViewport.addEventListener("resize",E),window.visualViewport.addEventListener("scroll",k));const P=()=>{s=!0,a&&cancelAnimationFrame(a),M?.disconnect(),window.removeEventListener("resize",E),window.removeEventListener("orientationchange",E),window.removeEventListener("scroll",k,!0),window.visualViewport&&(window.visualViewport.removeEventListener("resize",E),window.visualViewport.removeEventListener("scroll",k))},h=y(!0);return{destroy:P,reposition:()=>y(!1),result:h}}function X(e){return typeof window<"u"&&typeof window[e]=="function"?window[e]:null}function Ee(...e){return X("setFilter")?.(...e)}function to(...e){return X("setBookingsSubview")?.(...e)}function Bn(...e){return X("toast")?.(...e)}function Se(...e){return X("updateGoLiveBanner")?.(...e)}function An(...e){return X("seedTourRevenueShell")?.(...e)}function Cn(...e){return X("finishTourHydration")?.(...e)}function Tn(...e){return X("goLive")?.(...e)}let pe=null,Be=null,re=null;function K(){if(document.getElementById("frontdeskTourPolishStyle"))return;const e=document.createElement("style");e.id="frontdeskTourPolishStyle",e.textContent=`
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
  `,document.head.appendChild(e)}function mt(){pe&&(document.removeEventListener("keydown",pe),pe=null)}function In(e){mt(),pe=t=>{if(t.defaultPrevented)return;const i=t.target&&t.target.tagName?t.target.tagName.toLowerCase():"";i==="input"||i==="textarea"||i==="select"||t.target?.isContentEditable||(t.key==="Escape"?(t.preventDefault(),e.onSkip?.()):t.key==="Enter"||t.key==="ArrowRight"?(t.preventDefault(),e.onNext?.()):t.key==="ArrowLeft"&&(t.preventDefault(),e.onBack?.()))},document.addEventListener("keydown",pe)}function st(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function N(e){K();const t=e||{};let i=document.getElementById("tourBlurOverlay");return i||(i=document.createElement("div"),i.id="tourBlurOverlay",i.style.cssText="position:fixed;inset:0;z-index:99998;",document.body.appendChild(i)),i.style.background=t.dim||"rgba(17,24,39,0.22)",i.style.pointerEvents=t.blockPointer?"auto":"none",t.lockScroll&&(document.body.style.overflow="hidden"),i}const ve="rgba(17,24,39,0.42)";function le(){const e=document.getElementById("tourTooltip"),t=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(!e||t)return Promise.resolve();e.style.pointerEvents="none";const i=e.firstElementChild;return i&&(i.style.animation="tourPanelOut 0.16s ease-in forwards"),new Promise(o=>setTimeout(o,150))}function Mn(e,t){return re?.destroy(),re=En(e,{attribute:"data-tour-spotlight-clone",zIndex:99999,prepareClone(i){i.style.boxShadow=t?.spotlightBoxShadow??"0 18px 46px rgba(26,43,34,0.24)",i.style.outline=t?.spotlightOutline??"1px solid rgba(255,255,255,0.82)",i.style.outlineOffset=t?.spotlightOutlineOffset??"2px",t?.spotlightBackground&&(i.style.background=t.spotlightBackground,i.style.backgroundColor=t.spotlightBackground),t?.spotlightBorderRadius&&(i.style.borderRadius=t.spotlightBorderRadius)}}),re?.element||null}function Y(e){const t=e||{};mt(),Be?.destroy(),Be=null,re?.destroy(),re=null;const i=document.getElementById("tourTooltip");i&&i.remove();const o=document.getElementById("tourBlurOverlay");o&&!t.keepOverlay&&o.remove(),document.querySelectorAll("[data-tour-spotlight-clone]").forEach(r=>r.remove()),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex=r.dataset.tourOrigZIndex||"",r.style.isolation=r.dataset.tourOrigIsolation||"",r.style.boxShadow=r.dataset.tourOrigBoxShadow||"",r.style.outline=r.dataset.tourOrigOutline||"",r.style.outlineOffset=r.dataset.tourOrigOutlineOffset||"",r.style.transition=r.dataset.tourOrigTransition||"",r.style.borderRadius=r.dataset.tourOrigBorderRadius||"",r.style.opacity=r.dataset.tourOrigOpacity||"";const a=r.dataset.tourOrigBackground||"",s=r.dataset.tourOrigBackgroundColor||"";s?r.style.backgroundColor=s:r.style.removeProperty("background-color"),a?r.style.background=a:r.style.removeProperty("background"),r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition,delete r.dataset.tourOrigZIndex,delete r.dataset.tourOrigIsolation,delete r.dataset.tourOrigBoxShadow,delete r.dataset.tourOrigOutline,delete r.dataset.tourOrigOutlineOffset,delete r.dataset.tourOrigTransition,delete r.dataset.tourOrigBackground,delete r.dataset.tourOrigBackgroundColor,delete r.dataset.tourOrigBorderRadius,delete r.dataset.tourOrigOpacity});const n=document.getElementById("goLiveBanner");n&&n.dataset.tourHidden&&(delete n.dataset.tourHidden,typeof Se=="function"&&Se()),t.keepOverlay||(document.body.style.overflow="")}function Pn(){const e=document.getElementById("tourTooltip"),t=Array.from(document.querySelectorAll("[data-tour-spotlight-clone]")),i=Array.from(document.querySelectorAll("[data-tour-highlighted]")),o=[e,...t,...i].filter(Boolean);return!o.length&&!i.length?(Y({keepOverlay:!0}),Promise.resolve()):(mt(),window.matchMedia("(prefers-reduced-motion: reduce)").matches?(Y({keepOverlay:!0}),Promise.resolve()):(e&&(e.style.pointerEvents="none"),o.forEach(r=>{r.style.transition="opacity 0.07s ease, transform 0.07s ease",r.style.opacity="1"}),requestAnimationFrame(()=>{o.forEach(r=>{r.style.opacity="0",r.id==="tourTooltip"&&(r.style.transform="translateY(4px)")})}),new Promise(r=>{setTimeout(()=>{Y({keepOverlay:!0}),r()},85)})))}function Rn(e){const t=[e,...document.querySelectorAll("[data-tour-spotlight-clone]"),...document.querySelectorAll("[data-tour-highlighted]")].filter(Boolean);t.forEach(i=>{i.style.transition="opacity 0.1s ease, transform 0.1s ease",i.style.opacity="0",i.id==="tourTooltip"&&(i.style.transform="translateY(4px)")}),requestAnimationFrame(()=>{t.forEach(i=>{i.style.opacity="1",i.id==="tourTooltip"&&(i.style.transform="translateY(0)")})})}function ne(e,t){if(!t.openAccordion)return;const i=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(!i)return;const o=i.querySelector(".accordion-body");if(!o)return;if(o.style.display==="none"||getComputedStyle(o).display==="none"){o.style.display="block";const r=i.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}}function J(e){if(!e)return null;for(const t of String(e).split(",").map(i=>i.trim()).filter(Boolean)){const i=document.querySelector(t);if(i&&i.isConnected)return i}return null}function ce(e,t){if(t.highlightSelector){const i=J(t.highlightSelector);if(i)return i}if(t.highlightCard){const i=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(i)return i}return t.targetParent&&(e.closest(".booking-card")||e.closest(".accordion-body"))||e}function be(e,t){if(!t)return e;const i=String(t.target||"").split(",").map(o=>o.trim()).filter(Boolean);for(const o of i){const n=document.querySelector(o);if(n&&n.isConnected)return n}if(t.accordionCard){const o=document.querySelector(t.accordionCard);if(o&&o.isConnected)return o}return e&&e.isConnected?e:null}function Ae(e,t){if(!e||!e.isConnected)return null;const i=e.getBoundingClientRect();return i.width<2||i.height<2||!t&&(i.bottom<8||i.top>window.innerHeight-8)?null:i}function po(e,t){const i=J(e.anchorSelector);if(i){const o=Ae(i,!0);if(o)return o}return Ae(t,!0)}function oo(e,t){const i=e.tooltipAnchorSelector||e.anchorSelector,o=J(i);if(o){const n=Ae(o,!0);if(n)return n}return po(e,t)}function Ce(e){const t=e||"auto";try{window.scrollTo({top:0,left:0,behavior:t})}catch{}const i=document.scrollingElement||document.documentElement;i&&(i.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(o=>{const n=document.querySelector(o);n&&(n.scrollTop=0)})}function go(e,t,i){const o=i||{},n=t.scrollTarget||t.accordionCard,r=(n?J(n):null)||e;if(!r&&!t.scrollToTop)return Promise.resolve();const a=t.scrollBlock||"nearest",s=window.matchMedia("(prefers-reduced-motion: reduce)").matches,d=o.smooth&&!s?"smooth":g.settingsTourActive||s?"auto":"smooth";return new Promise(c=>{if(t.scrollToTop&&(Ce(d),t.scrollToTopOnly)){requestAnimationFrame(()=>requestAnimationFrame(()=>{t.forcePageTop&&Ce("auto"),c()}));return}if(!r){c();return}if(r.scrollIntoView({behavior:d,block:a,inline:"nearest"}),d==="auto"){requestAnimationFrame(()=>requestAnimationFrame(c));return}let f=!1;const y=()=>{f||(f=!0,window.removeEventListener("scrollend",k),clearTimeout(E),requestAnimationFrame(()=>requestAnimationFrame(c)))},k=()=>y();"onscrollend"in window&&window.addEventListener("scrollend",k,{once:!0});const E=setTimeout(y,520)})}function fo(){Y(),localStorage.setItem("settingsTourStep","handoff");const e=()=>{const i=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');i&&Ee("apps",i);const o=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof o=="function"&&o(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},t=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof t=="function"?t().then(e).catch(e):e()}function ue(){Y({keepOverlay:!0}),K(),g.settingsTourActive=!1,Se(),N({blockPointer:!0,lockScroll:!0,dim:ve});const e=document.createElement("div");if(e.id="tourTooltip",e.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",e.innerHTML=`
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
    </div>`,document.body.appendChild(e),!document.getElementById("tourModalAnimStyle")){const t=document.createElement("style");t.id="tourModalAnimStyle",t.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(t)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const i="https://"+(g.activeHotelDomain||g.activeHotelId+".mktel.co");navigator.clipboard.writeText(i).catch(()=>{}),le().then(()=>{Y(),g.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),Bn("Booking link copied!","success"),Cn(),mo()})}}function mo(e){K();const t=document.createElement("div");t.id="testDriveOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(17,24,39,0.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;">
      <div style="padding:26px 22px 22px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:42px;height:42px;border-radius:14px;background:#E8F5EE;color:#2E7D5B;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="rocket" style="width:22px;height:22px;"></i></div>
          <div>
            <div style="font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#2E7D5B;margin-bottom:3px;">Activation</div>
            <div style="font-size:20px;font-weight:850;color:#1A2B22;line-height:1.18;">${g.marketelTrialEligible!==!1?"Start free when you are ready.":"Reactivate when you are ready."}</div>
          </div>
        </div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.6;margin:0 0 18px;">Your link is copied. ${g.marketelTrialEligible!==!1?"Start 14 days of full access for $0 today when you want guests to submit real bookings.":"Reactivate when you want guests to submit real bookings again."}</p>
        <div style="background:#F4F8F5;border-radius:14px;padding:14px;border:1.5px solid #D8E4DC;text-align:left;margin-bottom:18px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Booking page accepts reservations</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Card verification helps reduce no-shows</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">Front Desk shows new bookings</span></div>
            <div style="display:flex;align-items:center;gap:9px;"><span style="color:#2E7D5B;font-weight:850;">✓</span><span style="font-size:13px;color:#1A2B22;">No OTA commission</span></div>
          </div>
        </div>
        <button id="activateNowBtn" style="width:100%;padding:15px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:850;cursor:pointer;margin-bottom:8px;box-shadow:0 8px 20px rgba(46,125,91,0.22);">${g.marketelTrialEligible!==!1?"Start 14 days free":"Reactivate — $199/month"}</button>
        <p style="font-size:11px;color:#6B7D72;margin:0 0 14px;text-align:center;">${g.marketelTrialEligible!==!1?"$0 today. Card required. Then $199/month.":"Billed monthly."} Cancel anytime.</p>
        <button id="activateLaterBtn" style="width:100%;background:none;border:none;color:#6B7D72;font-size:12px;font-family:inherit;font-weight:750;cursor:pointer;padding:8px 12px;">Keep page inactive for now</button>
      </div>
    </div>`,document.body.appendChild(t),document.body.style.overflow="hidden",typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0);const i=()=>{t.remove(),document.body.style.overflow=""};document.getElementById("activateNowBtn").onclick=()=>{i(),Tn()},document.getElementById("activateLaterBtn").onclick=()=>{i();const o=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');o&&Ee("bookings",o)}}function lt(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),ue();return}localStorage.getItem("settingsTourDone")||localStorage.removeItem("settingsTourStep"),g.settingsTourActive=!0,Se(),An();const e=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');e&&Ee("settings",e);function t(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!g.editRoomsLoadPromise)return;const u=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;u&&u()}t();const i=[{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview your booking page",text:"Open the exact page guests will use. It is safe to review before activation, so check the basics here first.",openAccordion:!1,tab:"settings",scrollToTop:!0,scrollToTopOnly:!0,forcePageTop:!0,scrollBlock:"start"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"This page is the source of truth for your guest site. Update the property name, address, phone, policy, rooms, photos, and prices here.",openAccordion:!1,tab:"settings",scrollBlock:"nearest",tooltipPosition:"below",tooltipGap:22},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo-placeholder, #editRoomsCards [data-tour-room-card="1"] .room-edit-photo',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',title:"Add room photos",text:"Use real room photos. A clear first photo makes the page feel legitimate and helps guests decide faster.",openAccordion:!1,tab:"settings",scrollBlock:"center"},{target:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',highlightSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] [data-tour-room-details-anchor="1"]',tooltipAnchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-fields',title:"Edit room details",text:"Room name, description, guest count, amenities, and units all show on the booking page. Keep this short and accurate.",openAccordion:!1,tab:"settings",scrollBlock:"start",tooltipPosition:"auto",tooltipGap:10,spotlightBackground:"#fff",spotlightBorderRadius:"12px",spotlightBoxShadow:"none",spotlightOutline:"none",spotlightOutlineOffset:"0"},{target:"#tour-booking-link-card",highlightSelector:"#tour-booking-link-card",anchorSelector:"#tour-booking-link-card",scrollTarget:"#tour-booking-link-card",title:"Share your direct link",text:"This is the link to send guests, add to your website, and place on Google Business Profile. QR tools live here too.",openAccordion:!1,tab:"settings",scrollBlock:"start"},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-card",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices before you share the link. Guests book from these rates on your direct page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",tooltipPosition:"below",tooltipGap:8},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",subview:"bookings",customModal:"bookings"},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings, card status, and estimated OTA commission savings. Cards are verified, and you collect payment at check-in.",openAccordion:!1,tab:"bookings",subview:"revenue",waitForVisible:!0,scrollBlock:"start"},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let o=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(o)||o<0||o>=i.length)&&(o=0,localStorage.removeItem("settingsTourStep"));function n(h){Y(h)}function r(){le().then(()=>{n({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),ue()})}function a(h,l){return!(!h||!l||h.customModal||l.customModal||h.tab!==l.tab||!h.target||!l.target)}function s(h,l){if(h.customModal){c(h,l);return}requestAnimationFrame(()=>c(h,l))}function d(h){const l=h||{};if(l.keepCurrentUi||n({keepOverlay:!0}),document.body.style.overflow="",o>=i.length){n({keepOverlay:!0}),localStorage.removeItem("settingsTourStep"),ue();return}const u=i[o];if(u.subview==="revenue"&&!g.revenueEnabled){o++,localStorage.setItem("settingsTourStep",String(o)),d();return}if(u.tab==="apps"&&!(isStandaloneApp()||g.frontdeskInstalled)&&u.target&&!u.target.includes("tour-fd-install")){o++,localStorage.setItem("settingsTourStep",String(o)),d();return}if(u.customModal||N(),u.tab&&u.tab!==g.currentFilter){const x=document.querySelector(`.tab[data-nav-filter="${u.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${u.tab}"]`);if(x&&Ee(u.tab,x),u.tab==="bookings"&&u.subview&&to(u.subview),u.tab==="apps"){const p=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof p=="function"&&p(!0)}s(u,l);return}if(u.tab==="bookings"&&u.subview&&u.subview!==g.bookingsSubview){to(u.subview),s(u,l);return}s(u,l)}function c(h,l){const u=l||{};if(h.customModal==="homescreen"){u.keepCurrentUi&&n({keepOverlay:!0}),E();return}if(h.customModal==="bookings"){u.keepCurrentUi&&n({keepOverlay:!0}),P();return}if(h.customModal==="availability"){u.keepCurrentUi&&n({keepOverlay:!0}),M();return}if(h.customModal==="finale"){u.keepCurrentUi&&n({keepOverlay:!0}),ue();return}if(h.customModal==="guestAppsStory"){u.keepCurrentUi&&n({keepOverlay:!0}),fo();return}if(h.waitForVisible){const B=h.target.split(",").map(S=>S.trim());let m=0;const v=30;N();const b=g.settingsTourActive?60:200,w=()=>{if(m++,h.tab==="apps"){const C=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof C=="function"&&C(!0)}let S=null;for(const C of B)if(S=document.querySelector(C),S)break;if(S&&(h.openAccordion&&ne(S,h),h.openAccordion||S.offsetParent!==null)){f(S,h,u);return}m<v?setTimeout(w,b):(o++,localStorage.setItem("settingsTourStep",String(o)),d())};w();return}function x(B){const m=B.target.split(",").map(v=>v.trim());for(const v of m){const b=document.querySelector(v);if(b&&!(!B.openAccordion&&b.offsetParent===null&&getComputedStyle(b).position!=="fixed"))return b}if(B.accordionCard){const v=document.querySelector(B.accordionCard);if(v)return v}return null}function p(B,m){const v=x(B);if(v){m(v);return}const b=B.tab==="settings"&&!B.customModal&&B.target,w=B.tab==="apps"&&!B.customModal&&B.target;if(!b&&!w){o++,localStorage.setItem("settingsTourStep",String(o)),d();return}N();let S=0;if(b&&t(),w){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}const C=g.settingsTourActive?60:250,A=()=>{if(S++,w){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}const T=x(B);if(T){m(T);return}if(t(),w){const I=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof I=="function"&&I(!0)}S<48?setTimeout(A,C):(o++,localStorage.setItem("settingsTourStep",String(o)),d())};A()}p(h,B=>f(B,h,u))}function f(h,l,u){const x=u||{};if(ne(h,l),h=ce(h,l),(!h||!h.isConnected)&&(h=be(h,l),h&&(h=ce(h,l))),!h){o++,localStorage.setItem("settingsTourStep",String(o)),d();return}const p=h;N(),go(p,l,{smooth:!!x.keepCurrentUi}).then(()=>{if(l.forcePageTop&&Ce("auto"),!p.isConnected){o++,localStorage.setItem("settingsTourStep",String(o)),d();return}ne(p,l),x.keepCurrentUi&&(n({keepOverlay:!0}),N()),l.noHighlight||(p.dataset.tourOrigPosition||(p.dataset.tourOrigPosition=p.style.position||""),p.dataset.tourOrigZIndex||(p.dataset.tourOrigZIndex=p.style.zIndex||""),p.dataset.tourOrigIsolation||(p.dataset.tourOrigIsolation=p.style.isolation||""),p.dataset.tourOrigBoxShadow||(p.dataset.tourOrigBoxShadow=p.style.boxShadow||""),p.dataset.tourOrigOutline||(p.dataset.tourOrigOutline=p.style.outline||""),p.dataset.tourOrigOutlineOffset||(p.dataset.tourOrigOutlineOffset=p.style.outlineOffset||""),p.dataset.tourOrigTransition||(p.dataset.tourOrigTransition=p.style.transition||""),p.dataset.tourOrigBackground||(p.dataset.tourOrigBackground=p.style.background||""),p.dataset.tourOrigBackgroundColor||(p.dataset.tourOrigBackgroundColor=p.style.backgroundColor||""),p.dataset.tourOrigBorderRadius||(p.dataset.tourOrigBorderRadius=p.style.borderRadius||""),p.dataset.tourOrigOpacity||(p.dataset.tourOrigOpacity=p.style.opacity||""),p.style.position=p.style.position||"relative",p.style.zIndex="99999",p.style.isolation="isolate",p.style.transition="box-shadow 0.18s ease, outline 0.18s ease",p.style.boxShadow="0 0 0 1px rgba(255,255,255,0.92), 0 18px 46px rgba(26,43,34,0.22)",p.style.outline="1px solid rgba(255,255,255,0.82)",p.style.outlineOffset="2px",l.spotlightBoxShadow!=null&&(p.style.boxShadow=l.spotlightBoxShadow),l.spotlightOutline!=null&&(p.style.outline=l.spotlightOutline),l.spotlightOutlineOffset!=null&&(p.style.outlineOffset=l.spotlightOutlineOffset),l.spotlightBackground&&(p.style.background=l.spotlightBackground,p.style.backgroundColor=l.spotlightBackground),l.spotlightBorderRadius&&(p.style.borderRadius=l.spotlightBorderRadius),x.keepCurrentUi&&(p.style.opacity="0"),p.setAttribute("data-tour-highlighted","1")),document.body.style.overflow="";const B=()=>{const b=J(l.anchorSelector)||p;if(l.freezeTooltip){const A=b&&b.isConnected?b.getBoundingClientRect():null;y(b,l,A&&A.width>=2?A:null,{fadeIn:!!x.keepCurrentUi});return}const w=be(p,l);let S=w?ce(w,l):p;ne(S,l);const C=l.tooltipAnchor?null:oo(l,S);y(S||p,l,C,{fadeIn:!!x.keepCurrentUi})};if(l.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(B));return}const m=(v=0)=>{requestAnimationFrame(()=>{if(l.forcePageTop&&Ce("auto"),l.tooltipAnchor){B();return}const b=be(p,l);let w=b?ce(b,l):p;ne(w,l);const S=oo(l,w);if(!S&&v<4){requestAnimationFrame(()=>m(v+1));return}y(w||p,l,S,{fadeIn:!!x.keepCurrentUi})})};m(0)})}function y(h,l,u,x){const p=x||{},B=document.getElementById("tourTooltip");B&&B.remove(),K();const m=document.createElement("div");m.id="tourTooltip";const v=Math.min(o+1,i.length),b=Math.max(8,Math.min(100,Math.round(v/i.length*100))),w=st(l.title||"Quick setup"),S=st(l.text||""),C=l.primaryLabel||(o<i.length-1?"Next":"Got it"),A=o<=0;m.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;visibility:hidden;",m.innerHTML=`
      <div class="tour-panel" role="dialog" aria-live="polite" aria-label="${w}">
        <div class="tour-progress-row">
          <div class="tour-progress-label">${v} of ${i.length}</div>
          <div class="tour-progress-track">
            <div class="tour-progress-fill" style="width:${b}%;"></div>
          </div>
        </div>
        <div class="tour-title">${w}</div>
        <p class="tour-copy">${S}</p>
        <div class="tour-actions">
          <button id="tourBackBtn" class="tour-btn" type="button" ${A?"disabled":""}>Back</button>
          <button id="tourSkipBtn" class="tour-btn tour-btn-ghost" type="button">Skip</button>
          <button id="tourNextBtn" class="tour-btn tour-btn-primary" type="button">${st(C)}</button>
        </div>
      </div>`,document.body.appendChild(m);const T=m.querySelector(".tour-panel"),I=J(l.tooltipAnchorSelector||l.anchorSelector)||h;l.noHighlight||Mn(h,l),Be?.destroy(),Be=Sn({tooltip:m,panel:T,target:h,anchor:I,spotlight:re,options:{preferredPlacement:l.tooltipPosition||"auto",maxWidth:380,gap:l.tooltipGap??10,autoScroll:l.autoScroll!==!1,avoidBottomSelectors:[".mobile-bottom-nav","#previewSiteBar"]}}),m.style.visibility="visible",p.fadeIn&&Rn(m),k()}function k(){const h=document.getElementById("tourNextBtn"),l=document.getElementById("tourSkipBtn"),u=v=>{if(v<0)return;const b=a(i[o],i[v]),w=()=>{o=v,localStorage.setItem("settingsTourStep",String(o)),d({keepCurrentUi:b})};Pn().then(w)},x=()=>{u(o+1)},p=()=>{r()},B=()=>{o<=0||u(o-1)};h&&(h.onclick=x),l&&(l.onclick=p);const m=document.getElementById("tourBackBtn");m&&(m.onclick=B),In({onNext:x,onBack:B,onSkip:p})}function E(){K(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms(),N({blockPointer:!0,lockScroll:!0,dim:ve});const h=g.activeHotelName||"Your Property",l=h.trim().charAt(0).toUpperCase(),u=h.length>10?h.slice(0,10):h,x="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",p="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",B="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",m=`<div style="${x}"><div style="${p}background:rgba(255,255,255,0.22);"></div><div style="${B}"></div></div>`,v=g.activeHotelAppIcon||"",b=v?`<img src="${v}" alt="" style="width:100%;height:100%;object-fit:contain;">`:l,w=v?`${p}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${p}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,S=`<div style="${x}"><div style="${w}">${b}</div><div style="${B}font-size:7.5px;color:#fff;font-weight:700;">${u}</div></div>`,C=[m,m,m,m,S,m,m,m].join(""),A=document.createElement("div");if(A.id="tourTooltip",A.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",A.innerHTML=`
      <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:tourPanelIn 0.22s ease-out;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${C}
            </div>
          </div>
        </div>
        <div style="padding:20px 22px 22px;text-align:center;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">1 of ${i.length}</div>
            <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
              <div style="height:100%;width:${Math.round(1/i.length*100)}%;border-radius:999px;background:#2E7D5B;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">Your property stays with them in Guestel</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests add <strong>${h}</strong> to Guestel from your booking page or QR. Your rooms, their stay and your messages remain one tap away without sending them back to <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Share your Guestel QR from the <strong>Guestel</strong> tab whenever a guest is in front of you.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(A),!document.getElementById("tourModalAnimStyle")){const T=document.createElement("style");T.id="tourModalAnimStyle",T.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(T)}document.getElementById("tourNextBtn").onclick=()=>{le().then(()=>{n({keepOverlay:!0}),o++,localStorage.setItem("settingsTourStep",String(o)),d()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}}function M(){K(),N({blockPointer:!0,lockScroll:!0,dim:ve});let h=0;const l=[`<div style="padding:20px 18px 0;">
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
              <span><i data-lucide="circle-check" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Rooms default to <strong>open</strong> with all units available</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span><i data-lucide="lock" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Toggle <strong>close</strong> on days you're fully booked</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span><i data-lucide="hash" style="width:14px;height:14px;"></i></span>
              <span style="font-size:13px;color:#166534;line-height:1.4;">Use +/− to reduce units when partially booked</span>
            </div>
          </div>
        </div>
      </div>`],u=document.createElement("div");u.id="tourTooltip",u.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";let x=!1;function p(){const m=h>=l.length-1?"Next — Bookings →":"Next →",v=x?"none":"tourPanelIn 0.22s ease-out",b=x?"tourPageIn 0.18s ease-out":"none";u.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">
            ${l[h]}
          </div>
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${l.map((w,S)=>`<div style="width:8px;height:8px;border-radius:50%;background:${S===h?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${m}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,x=!0,document.getElementById("tourNextBtn").onclick=()=>{h<l.length-1?(h++,p()):le().then(()=>{n({keepOverlay:!0}),o++,localStorage.setItem("settingsTourStep",String(o)),d()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}}if(document.body.appendChild(u),p(),!document.getElementById("tourModalAnimStyle")){const B=document.createElement("style");B.id="tourModalAnimStyle",B.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(B)}}function P(){K(),N({blockPointer:!0,lockScroll:!0,dim:ve});let h=0,l=!1;const u=[`
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
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:650;padding:4px 9px;border-radius:20px;">3 nights</span>
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
          <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:5px 0 13px;">If a walk-in or another channel took the room, tell Marketel Front Desk or block it in Availability. Marketel updates the dates shown on your direct booking page. If an online guest is affected, review that booking before cancelling it.</p>
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
              ${["13","14","15","16","17","18","19"].map((B,m)=>`<div style="aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;${m>=2&&m<=4?"background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;text-decoration:line-through;":"background:#fff;color:#7B8C82;border:1px solid #E5ECE8;"}">${B}</div>`).join("")}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #D8E4DC;border-radius:9px;padding:8px 9px;font-size:10px;font-weight:750;color:#1A2B22;"><span>0 rooms available</span><span style="color:#9CA3AF;">▾</span></div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px;">
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">✓</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">You checked it</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="color:#166534;margin-bottom:2px;"><i data-lucide="undo-2" style="width:16px;height:16px;"></i></div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Cancel if needed</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #D7EBDD;border-radius:11px;padding:10px;text-align:center;">
              <div style="font-size:17px;color:#166534;font-weight:900;margin-bottom:2px;">▦</div>
              <div style="font-size:10px;font-weight:800;color:#166534;">Dates stop selling</div>
            </div>
          </div>
        </div>`],x=document.createElement("div");x.id="tourTooltip",x.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";const p=()=>{const B=h>=u.length-1,m=h===0?"Next — Phone alerts →":h===1?"Next — Avoid conflicts →":"Next — Availability →",v=l?"none":"tourPanelIn 0.22s ease-out",b=l?"tourPageIn 0.18s ease-out":"none";x.innerHTML=`
        <div style="background:white;border:1.5px solid #D8E4DC;border-radius:18px;max-width:380px;width:100%;max-height:86vh;overflow-y:auto;box-shadow:0 24px 64px rgba(26,43,34,0.28);animation:${v};">
          <div style="animation:${b};">${u[h]}</div>
          <div style="padding:2px 18px 7px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;">
              ${u.map((w,S)=>`<div style="width:8px;height:8px;border-radius:50%;background:${S===h?"#2E7D5B":"#D8E4DC"};transition:background 0.2s ease;"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:750;cursor:pointer;">${m}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,l=!0,document.getElementById("tourNextBtn").onclick=()=>{if(!B){h++,p();return}le().then(()=>{n({keepOverlay:!0}),o++,localStorage.setItem("settingsTourStep",String(o)),d()})},document.getElementById("tourSkipBtn").onclick=()=>{r()}};if(document.body.appendChild(x),p(),!document.getElementById("tourModalAnimStyle")){const B=document.createElement("style");B.id="tourModalAnimStyle",B.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(B)}}d()}function ho(e){if(!e||typeof window.applyRiseStagger!="function")return;const t=e.querySelector(".settings-dashboard-grid");if(!t){window.applyRiseStagger(e,":scope > *");return}t.querySelectorAll(":scope > *").forEach(i=>{window.applyRiseStagger(i,":scope > *")})}function H(){return typeof window.isNativeFrontdeskApp=="function"&&window.isNativeFrontdeskApp()}function Me(){return document.body.classList.contains("frontdesk-editor-preview")||new URLSearchParams(window.location.search).get("previewEditor")==="1"}function zn(e){return/^(?:fd_|fds_|fdn_)/.test(String(e||""))}let we=null;function D(e){return String(e??"").trim()}function Pe(e,t={}){if(!(!Me()||window.parent===window))try{window.parent.postMessage({type:"marketel:editor-saved",kind:String(e||"booking-page"),hotelId:g.activeHotelId||"",...t},window.location.origin)}catch{}}function yo(){return`<div class="booking-card" style="margin-bottom:14px;">
    <div style="padding:18px;display:flex;align-items:center;gap:14px;">
      <div style="width:42px;height:42px;display:grid;place-items:center;flex:0 0 auto;border-radius:13px;background:var(--green-pale);color:var(--green);font-size:19px;font-weight:800;">?</div>
      <div style="min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:7px;font-size:14px;font-weight:800;color:var(--text);">Need help? <span class="marketel-support-unread"></span></div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.45;margin:4px 0 0;">Ask a question, report a problem, or share feedback directly with Marketel.</p>
      </div>
      <button type="button" onclick="openMarketelSupport()" style="flex:0 0 auto;padding:10px 13px;border-radius:10px;border:1.5px solid var(--green);background:#fff;color:var(--green);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;">Message us</button>
    </div>
  </div>`}function xo(e=null){const t=H(),i=t?"https://guest-lodge-backend.onrender.com":"",o=e?.request||null,n=o?.scheduledFor?new Date(o.scheduledFor).toLocaleDateString([],{year:"numeric",month:"short",day:"numeric"}):"",r=t?o?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
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
        <a href="${i}/privacy" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Privacy Policy</a>
        <a href="${i}/terms" target="_blank" rel="noopener" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Terms of Service</a>
        <a href="mailto:support@bookmarketel.com" style="color:var(--green);font-size:13px;font-weight:700;text-decoration:none;">Email support</a>
      </div>
      ${r}
    </div>
  </div>`}async function vo(){const e=document.getElementById("settingsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,i]=await Promise.all([api("GET","/api/crm/verify"),H()?api("GET","/api/crm/account-deletion/status").catch(()=>null):Promise.resolve(null)]),n="https://"+(t?.domain||g.activeHotelId+".mktel.co"),r="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(n),a=await api("GET","/api/crm/rooms");let s={nightly:69,weekly:299,monthly:999};a?.rates&&(s=a.rates);const d=a?.rooms||[];let c="";t?.subscribed||(c+=goLiveInlineCardHtml()),d.length?d.forEach(f=>{const y=f.images&&f.images.length>0;c+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${y?`<img src="${f.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                ${y?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${f.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${f.name}</div>
              ${f.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${f.description}</div>`:""}
            </div>
          </div>
        `}):c+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,c+=`
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
    `,c+=`
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
    `,c+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 6 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,c+=yo(),c+=xo(i),e.innerHTML=c,ho(e),window.refreshSupportSummary?.()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-alert" style="width:26px;height:26px;"></i></div><div class="empty-text">Failed to load settings</div></div>'}}}function Ln(){const e=document.getElementById("settings-booking-url");e&&navigator.clipboard.writeText(e.value).then(()=>{localStorage.setItem("linkCopied","1"),ge(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function Dn(){localStorage.setItem("settingsTourDone","1");const e=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",e);let t=0;const i=setInterval(()=>{t++;const o=document.getElementById("edit-rate-nightly");if(o||t>20){if(clearInterval(i),!o)return;const n=o.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const r=n.previousElementSibling?.querySelector(".accordion-arrow");r&&(r.style.transform="rotate(90deg)")}setTimeout(()=>{o.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const a=o.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${a.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const d=document.getElementById("checklistPointer");d&&d.remove()},6e3)},1e3)},100)}},200)}function $n(){const t="https://"+(g.activeHotelDomain||g.activeHotelId+".mktel.co");navigator.clipboard.writeText(t).then(()=>{localStorage.setItem("linkCopied","1"),ge(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function Fn(e,t){localStorage.setItem("settingsTourDone","1");const i=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",i);let o=0;const n=setInterval(()=>{o++;const r=document.querySelector(e);if(r||o>20){if(clearInterval(n),!r)return;r.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const s=r.getBoundingClientRect(),d=document.createElement("div");d.id="checklistPointer",d.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,d.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${t}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(d),setTimeout(()=>{const c=document.getElementById("checklistPointer");c&&c.remove()},6e3)},1e3)}},200)}function ht(){const e=String(g.token||localStorage.getItem("crmToken")||"").trim();return e&&(g.token=e),e}async function yt(e,t){const i=ht();if(!i)throw new Error("Not logged in");const o=await on(t),n=new FormData;n.append("image",o,o.name||"room.webp");const r=new URLSearchParams;g.activeHotelId&&r.set("hotelId",g.activeHotelId);const a=await fetch(`/api/crm/rooms/${e}/images?${r}`,{method:"POST",headers:{"x-crm-token":i,...H()?{"x-marketel-client":"ios"}:{}},body:n}),s=await a.json().catch(()=>({}));if(!a.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${a.status})`);return s}async function On(e,t){const i=e.target.files[0];if(i)try{await yt(t,i),toast("Photo uploaded!","success"),vo()}catch(o){toast(o.message||"Upload failed","error")}}async function Nn(){const e=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,i=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:i}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function qn(){const e=document.getElementById("settings-new-pin")?.value.trim();if(!e||e.length<6){toast("PIN must be at least 6 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");g.token=e,g.isMasterPin=!1,g.isDogfoodPreview=!1;try{localStorage.setItem("crmToken",g.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(t){toast(t.message||"Failed to change PIN","error")}}async function Hn(){window.openMarketelSupport?.()}function bo(e={}){const t=g.activeHotelDomain||g.activeHotelId+".mktel.co",i=!H()&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"),o=new URL(i?"http://localhost:5173/":"https://"+t+"/");i&&o.searchParams.set("hotelId",g.activeHotelId),o.searchParams.set("preview","1"),e.highlight&&o.searchParams.set("previewHighlight",String(e.highlight)),e.roomId&&o.searchParams.set("previewHighlightRoom",String(e.roomId)),e.refresh&&o.searchParams.set("previewRefresh",String(Date.now())),typeof window.openInAppBrowser=="function"?window.openInAppBrowser(o.toString()):window.open(o.toString(),"_blank","noopener")}function Un(e={}){const t=g.activeHotelDomain||g.activeHotelId+".mktel.co",i=!H()&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"),o=new URL(i?"http://localhost:5173/":"https://"+t+"/");i&&o.searchParams.set("hotelId",g.activeHotelId),o.searchParams.set("preview","1"),o.searchParams.set("previewCheckout","1"),o.searchParams.set("previewHighlight","checkout-policy"),e.refresh&&o.searchParams.set("previewRefresh",String(Date.now())),typeof window.openInAppBrowser=="function"?window.openInAppBrowser(o.toString()):window.open(o.toString(),"_blank","noopener")}function ae(e,t=""){if(!(!g.hotelSubscribed||Me())){if(e==="checkout-policy"){Un({refresh:!0});return}bo({highlight:e,roomId:t,refresh:!0})}}function wo(){if(!H()&&(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&g.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(g.activeHotelId);const t=g.activeHotelDomain||"";return t?"https://"+t+"/":""}function jn(){const e=wo();if(!e){toast("Your booking domain is still setting up.","info");return}typeof window.openInAppBrowser=="function"?window.openInAppBrowser(e):window.open(e,"_blank","noopener")}function _n(){const e=document.getElementById("previewSiteBar");e&&(e.style.display=g.currentFilter==="settings"?"block":"none")}function ge(){if(localStorage.getItem("settingsTourDone"))return;const e=parseInt(localStorage.getItem("settingsTourStep")||"0"),t=g.editRooms.some(a=>a.images&&a.images.length>0),i=!!localStorage.getItem("ratesChanged"),o=!!localStorage.getItem("linkCopied");e===2&&t&&localStorage.setItem("settingsTourStep","3"),e===3&&o&&localStorage.setItem("settingsTourStep","4"),e===4&&i&&localStorage.setItem("settingsTourStep","5");const n=document.getElementById("tourTooltip");n&&n.remove();const r=document.getElementById("tourBlurOverlay");r&&r.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(a=>{a.style.position=a.dataset.tourOrigPosition||"",a.style.zIndex=a.dataset.tourOrigZIndex||"",a.style.isolation=a.dataset.tourOrigIsolation||"",a.style.boxShadow=a.dataset.tourOrigBoxShadow||"",a.style.outline=a.dataset.tourOrigOutline||"",a.style.outlineOffset=a.dataset.tourOrigOutlineOffset||"",a.style.transition=a.dataset.tourOrigTransition||"",a.style.borderRadius=a.dataset.tourOrigBorderRadius||"",a.style.opacity=a.dataset.tourOrigOpacity||"";const s=a.dataset.tourOrigBackground||"",d=a.dataset.tourOrigBackgroundColor||"";d?a.style.backgroundColor=d:a.style.removeProperty("background-color"),s?a.style.background=s:a.style.removeProperty("background"),a.removeAttribute("data-tour-highlighted"),delete a.dataset.tourOrigPosition,delete a.dataset.tourOrigZIndex,delete a.dataset.tourOrigIsolation,delete a.dataset.tourOrigBoxShadow,delete a.dataset.tourOrigOutline,delete a.dataset.tourOrigOutlineOffset,delete a.dataset.tourOrigTransition,delete a.dataset.tourOrigBackground,delete a.dataset.tourOrigBackgroundColor,delete a.dataset.tourOrigBorderRadius,delete a.dataset.tourOrigOpacity}),document.body.style.overflow=""}function Vn(){let e=0;const t={},i=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many bookable rooms or units do you offer?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function o(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),e>=i.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",t).catch(()=>{})}catch{}ko();return}const r=i[e],a=document.createElement("div");a.id="onboardingOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",r.type==="text"?(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${i.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${r.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(a),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(t[r.key]=s,e++,o())}):(a.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${i.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${r.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${r.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(a),a.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{t[r.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{e++,o()},250)})}))}o()}function Yn(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(i=>{localStorage.removeItem(i)});const e=new URL(window.location.href);e.searchParams.set("welcome","1"),e.searchParams.set("reveal","1"),e.searchParams.delete("tab");const t=e.pathname+e.search+e.hash;if(t===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(t)}function ko(){const e=document.createElement("div");e.id="welcomeModalOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function t(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const o=typeof lt=="function"?lt:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;o&&o(),e.remove()}function i(){e.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="margin-bottom:12px;"><i data-lucide="house" style="width:28px;height:28px;"></i></div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">Guests use your direct booking page. This is the owner dashboard where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=t}document.body.appendChild(e),i(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function Te(){const e=document.getElementById("postActivationTourTooltip");e&&e.remove();const t=document.getElementById("postActivationTourOverlay");t&&t.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(i=>{i.style.boxShadow="",i.style.position="",i.style.zIndex="",i.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function ke(){Te(),localStorage.setItem("postActivationTourDone","1");const e=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",e)}catch{}}function Eo(){if(localStorage.getItem("postActivationTourDone")){ke();return}Te();const e=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. Once the Front Desk app is connected, new bookings can alert you even when it is closed."},{tab:"apps",navFilter:"apps",text:"<strong>Last step: open Guestel.</strong> Share the Guestel QR, see your property card, reply to verified guests, and send updates to guests who opt in."}];let t=0;function i(){if(Te(),t>=e.length){ke();return}const o=e[t],n=document.querySelector(`.tab[data-nav-filter="${o.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${o.navFilter}"]`);n&&setFilter(o.tab,n);const r=document.createElement("div");r.id="postActivationTourOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(r),document.body.style.overflow="hidden",setTimeout(()=>{const a=document.querySelector(`.tab[data-nav-filter="${o.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${o.navFilter}"]`);a&&(a.setAttribute("data-post-activation-highlight","1"),a.style.position="relative",a.style.zIndex="100003",a.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",a.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=a?a.getBoundingClientRect():{left:24,bottom:80,width:200},d=document.createElement("div");d.id="postActivationTourTooltip";const c=Math.min(300,window.innerWidth-32),f=Math.max(16,Math.min(s.left+s.width/2-c/2,window.innerWidth-c-16)),y=Math.min(s.bottom+14,window.innerHeight-180);d.style.cssText=`position:fixed;z-index:100004;left:${f}px;top:${y}px;max-width:${c}px;width:${c}px;`;const k=t>=e.length-1;d.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${t+1} / ${e.length}</p>
          <p style="margin:0 0 14px;">${o.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${k?"Open Guestel":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(d),document.getElementById("postActivationTourNext").onclick=()=>{t+=1,i()},document.getElementById("postActivationTourSkip").onclick=()=>{ke()}},o.tab==="apps"?80:0)}i()}window.startPostActivationTabTour=Eo;function So(){dn()}async function Gn(){if(isEditPageDomReady())return;if(g.editRoomsLoadPromise)return g.editRoomsLoadPromise;const e=document.getElementById("editRoomsList");if(e){g.editRoomsLoadPromise=(async()=>{e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,i,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify"),H()?api("GET","/api/crm/account-deletion/status").catch(()=>null):Promise.resolve(null)]);if(!t.rooms)throw new Error("No data");g.editRooms=t.rooms;const n=i?.hotelName||"";n&&(g.activeHotelName=n),i&&(g.hotelSubscribed=!!i.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const r=i?.hotelSubtitle||"",a=i?.hotelAddress||"",s=i?.hotelPhone||"";we={name:D(n),subtitle:D(r),address:D(a),phone:D(s),cancellationPolicy:D(i?.cancellationPolicy)};const d=i?.appIconUrl||"";g.activeHotelAppIcon=d,updateFrontdeskManifestLink();let c={nightly:69,weekly:483,monthly:1932,taxRate:0};t.rates&&(c=t.rates),g.editRates=c;const y="https://"+(i?.domain||g.activeHotelId+".mktel.co"),k=Me();let E=`
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
          <button onclick="saveHotelInfo('header')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">${k||g.hotelSubscribed?"Save &amp; see changes":"Save"}</button>
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
      ${ye("Checkout note",`
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 10px;line-height:1.5;">One line shown to guests on the checkout page. Check-in and check-out times, or anything they should know before paying.</p>
        <input type="text" value="${(i?.cancellationPolicy||"").replace(/"/g,"&quot;")}" id="edit-hotel-policy" placeholder="e.g. Check-in 3 PM · Check-out 11 AM" style="width:100%;padding:11px 13px;font-size:13px;color:var(--text);border:1.5px solid var(--border);border-radius:10px;background:var(--white);outline:none;font-family:inherit;">
        <button onclick="saveHotelInfo('policy')" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
      `,{open:!i?.cancellationPolicy,hint:i?.cancellationPolicy?"":"Not set yet"})}
      ${ye("Your booking link",`
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${y}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${y.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Copy Link</button>
          </div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Use this link on your website, Google Business Profile, or in a message.</p>
      `,{open:!0,id:"tour-booking-link-card"})}
      </div>
      <div class="dash-growth">
        <div id="yourPageGrowthPanel" style="scroll-margin-top:96px;">
          <div class="loading" style="padding:24px 0;"><div class="logo-sprite-bounce"></div> Loading direct-booking activity…</div>
        </div>
      </div>
      <div class="dash-d">
      ${ye("Rates",`
            <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
                <input type="number" value="${c.nightly}" id="edit-rate-nightly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
                <input type="number" value="${c.weekly}" id="edit-rate-weekly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
              <div>
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
                <input type="number" value="${c.monthly}" id="edit-rate-monthly" min="1" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
              </div>
            </div>
            <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${g.hotelSubscribed&&!k?"Save &amp; see changes":"Save Rates"}</button>`,{open:!(i?.rates?.nightly>0),hint:i?.rates?.nightly>0?`$${i.rates.nightly} nightly`:"Not set yet",id:"tour-rates-card"})}
      ${ye("Change PIN",`
            <div style="margin-bottom:12px;">
              <input type="text" id="edit-new-pin" value="${g.isMasterPin||zn(g.token)?"":g.token}" placeholder="${g.isMasterPin?"Enter a unique property PIN":"Enter new PIN (min 6 chars)"}" style="width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
            </div>
            <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${g.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>`)}
      ${i?.subscribed?`<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          ${i?.billingPortalAvailable===!1?'<p style="font-size:12px;color:var(--text-muted);line-height:1.5;margin:0;text-align:center;">This account is billed directly by Marketel.<br>Email <a href="mailto:support@bookmarketel.com" style="color:var(--green);font-weight:700;text-decoration:none;">support@bookmarketel.com</a> for any billing change.</p>':`<button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>`}
        </div>
      </div>`:""}
      ${yo()}
      ${xo(o)}
      </div>
      </div>
    `;e.innerHTML=E,ho(e),W(),window.renderGrowthPanel?.(),window.loadGrowthData?.().catch(()=>{}),window.refreshSupportSummary?.(),typeof lucide<"u"&&lucide.createIcons()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon"><i data-lucide="circle-alert" style="width:26px;height:26px;"></i></div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await g.editRoomsLoadPromise}finally{g.editRoomsLoadPromise=null}}}function xt(){W()}async function vt({render:e=!0}={}){const t=await api("GET","/api/crm/rooms");if(!Array.isArray(t?.rooms))throw new Error("Could not refresh rooms");return g.editRooms=t.rooms,t.rates&&(g.editRates=t.rates),e&&W(),g.editRooms}function W(){const e=document.getElementById("editRoomsCards");if(e){if(!g.editRooms.length){e.innerHTML='<div class="empty-state"><div class="empty-icon"><i data-lucide="bed" style="width:26px;height:26px;"></i></div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}e.innerHTML=g.editRooms.map((t,i)=>{const o=(t.amenities||"").split("•").map(a=>a.trim()).filter(Boolean),n=(t.images||[]).filter(a=>a&&a.url),r=jsStr(t.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${t.id}" ${i===0?'data-tour-room-card="1"':""}>
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
          + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${r}')">
        </label>
      </div>
      ${n.length>1?'<div class="room-edit-thumbs">'+n.map((a,s)=>`<div class="room-edit-thumb-wrap" data-thumb-id="${esc(a.id)}"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${r}', ${s})"><img src="${esc(a.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/room-placeholder.svg';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${r}','${jsStr(a.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
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
            ${o.map(a=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${Co(a)} ${a} <button onclick="removeAmenity('${t.id}','${a.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
          <button onclick="saveEditRoom('${t.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${Me()||g.hotelSubscribed?"Save &amp; see changes":"Save Changes"}</button>
          <button class="room-edit-delete-btn" onclick="deleteEditRoom('${t.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`}).join(""),window.applyRiseStagger?.(e),typeof lucide<"u"&&lucide.createIcons()}}function Bo(e){const t=g.editRooms.find(i=>String(i.id)===String(e));return(t&&t.images||[]).filter(i=>i&&i.url)}function Ao(e,t){const i=Bo(e);if(!i.length)return;const o=document.getElementById("edit-card-"+e);if(!o)return;const n=i.length,r=((Number(t)||0)%n+n)%n,a=o.querySelector(".room-edit-main-img");a&&(a.src=i[r].url),o.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(r));const s=o.querySelector(".room-edit-photo-count");s&&(s.textContent=r+1+" / "+n),o.querySelectorAll(".room-edit-image-dot").forEach((d,c)=>{d.classList.toggle("active",c===r),c===r?d.setAttribute("aria-current","true"):d.removeAttribute("aria-current")}),o.querySelectorAll(".room-edit-thumb").forEach((d,c)=>{d.classList.toggle("active",c===r),c===r?d.setAttribute("aria-current","true"):d.removeAttribute("aria-current")})}function Wn(e,t){const o=document.getElementById("edit-card-"+e)?.querySelector(".room-edit-photo"),n=parseInt(o?.getAttribute("data-photo-index")||"0",10)||0;Ao(e,n+t)}function Co(e){const t=e.toLowerCase();return t.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':t.includes("tv")||t.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':t.includes("fridge")||t.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':t.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':t.includes("housekeeping")||t.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':t.includes("bath")||t.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':t.includes("work")||t.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':t.includes("pet")||t.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':t.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':t.includes("kitchen")||t.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const bt=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let wt=null,G=[];function io(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function Kn(e){const t=String(e||"").trim().toLowerCase();return bt.find(i=>t===i.label.toLowerCase()||t===i.key||t.includes(i.key))}function kt(){const e=document.getElementById("amenityCustomPills");e&&(e.innerHTML=G.map((t,i)=>`
    <span style="display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:8px;background:#E8F5EE;color:#2E7D5B;font-size:13px;font-weight:650;">
      ${io(t)}
      <button type="button" onclick="removeCustomAmenity(${i})" aria-label="Remove ${io(t)}" style="width:20px;height:20px;border:0;background:transparent;color:inherit;font:700 17px/1 system-ui;cursor:pointer;padding:0;">×</button>
    </span>`).join(""),e.hidden=G.length===0)}function To(e){wt=e;const i=(g.editRooms.find(d=>d.id===e)?.amenities||"").split("•").map(d=>d.trim()).filter(Boolean),o=i.map(d=>d.toLowerCase());G=i.filter(d=>!Kn(d));let n=document.getElementById("amenityPickerModal");n||(document.body.insertAdjacentHTML("beforeend",`
      <div id="amenityPickerModal" style="display:none;position:fixed;inset:0;background:transparent;z-index:10000;align-items:center;justify-content:center;padding:20px;">
        <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
          <div style="font-size:16px;font-weight:700;margin-bottom:14px;">Select Amenities</div>
          <div id="amenityPickerGrid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;"></div>
          <div id="amenityCustomPills" style="display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px;"></div>
          <button type="button" onclick="openCustomAmenityModal()" style="width:100%;margin-bottom:14px;padding:10px 12px;border:1.5px dashed #cbd5d0;border-radius:9px;background:#f8faf9;color:#2E7D5B;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">+ Custom amenity</button>
          <div style="display:flex;gap:8px;">
            <button onclick="confirmAmenityPicker()" style="flex:1;padding:11px;border-radius:10px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Done</button>
            <button onclick="closeAmenityPicker()" style="padding:11px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:none;font-family:inherit;font-size:14px;color:#6b7280;cursor:pointer;">Cancel</button>
          </div>
        </div>
      </div>
    `),document.getElementById("amenityPickerModal").addEventListener("click",Ie),n=document.getElementById("amenityPickerModal"));const r=g.editRooms[0];r&&String(r.id)===String(e)?n.dataset.previewActionScope="first-room-editor":delete n.dataset.previewActionScope;const s=document.getElementById("amenityPickerGrid");s.innerHTML=bt.map(d=>{const c=o.some(f=>f.includes(d.key));return`<button onclick="toggleAmenityPreset(this,'${d.key}')" data-key="${d.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${c?"#2E7D5B":"#e5e7eb"};background:${c?"#E8F5EE":"white"};color:${c?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${d.icon}" style="width:14px;height:14px;"></i> ${d.label}</button>`}).join(""),kt(),n.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function Jn(e,t){const i=e.style.borderColor==="rgb(46, 125, 91)";e.style.borderColor=i?"#e5e7eb":"#2E7D5B",e.style.background=i?"white":"#E8F5EE",e.style.color=i?"#1a1a2e":"#2E7D5B"}function Ie(){Re(),document.getElementById("amenityPickerModal").style.display="none",wt=null,G=[]}function ct(){const e=document.getElementById("amenityCustomModal");if(!e||e.style.display==="none")return;const t=window.visualViewport;e.style.top=`${Math.round(t?.offsetTop||0)}px`,e.style.height=`${Math.round(t?.height||window.innerHeight)}px`}function Qn(){let e=document.getElementById("amenityCustomModal");return e||(document.body.insertAdjacentHTML("beforeend",`
    <div id="amenityCustomModal" data-marketel-keyboard-surface style="display:none;position:fixed;left:0;right:0;top:0;height:100vh;background:transparent;z-index:10020;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
      <div style="width:100%;max-width:340px;padding:20px;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.22);" onclick="event.stopPropagation()">
        <div style="font-size:16px;font-weight:750;color:#1a1a2e;margin-bottom:12px;">Custom amenity</div>
        <input type="text" id="amenityCustomInput" maxlength="60" enterkeyhint="done" autocomplete="off" placeholder="e.g. EV charger" style="width:100%;box-sizing:border-box;padding:12px;border:1.5px solid #d9dfdc;border-radius:10px;font-family:inherit;font-size:16px;outline:none;" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmCustomAmenity();}">
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button type="button" onclick="closeCustomAmenityModal()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #e5e7eb;background:white;color:#6b7280;font-family:inherit;font-size:14px;font-weight:700;">Cancel</button>
          <button type="button" onclick="confirmCustomAmenity()" style="flex:1;padding:11px;border-radius:10px;border:0;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;">Add</button>
        </div>
      </div>
    </div>`),e=document.getElementById("amenityCustomModal"),e.addEventListener("click",Re),window.visualViewport&&e.dataset.viewportBound!=="1"&&(e.dataset.viewportBound="1",window.visualViewport.addEventListener("resize",ct),window.visualViewport.addEventListener("scroll",ct)),e)}function Zn(){const e=Qn(),t=document.getElementById("amenityCustomInput");t&&(t.value=""),e.style.display="flex",ct(),requestAnimationFrame(()=>t?.focus({preventScroll:!0}))}function Re(){const e=document.getElementById("amenityCustomModal");e&&(document.getElementById("amenityCustomInput")?.blur(),e.style.display="none")}function Xn(){const e=document.getElementById("amenityCustomInput"),t=String(e?.value||"").replace(/\s+/g," ").trim();t&&(G.some(i=>i.toLowerCase()===t.toLowerCase())||G.push(t),Re(),kt())}function er(e){G.splice(Number(e),1),kt()}function tr(){const e=g.editRooms.find(o=>o.id===wt);if(!e){Ie();return}const t=document.getElementById("amenityPickerGrid"),i=[];t.querySelectorAll("button").forEach(o=>{if(o.style.background==="rgb(232, 245, 238)"){const n=bt.find(r=>r.key===o.dataset.key);n&&i.push(n.label)}}),i.push(...G),e.amenities=i.join(" • "),Ie(),xt(),typeof lucide<"u"&&lucide.createIcons()}function or(e){To(e)}function ir(e,t){const i=g.editRooms.find(n=>n.id===e);if(!i)return;const o=(i.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);i.amenities=o.filter(n=>n!==t).join(" • "),xt(),typeof lucide<"u"&&lucide.createIcons()}async function nr(e="header"){const t=document.getElementById("edit-hotel-name")?.value.trim(),i=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),n=document.getElementById("edit-hotel-phone")?.value.trim(),r=document.getElementById("edit-hotel-policy")?.value.trim(),a={name:t,subtitle:i,address:o,phone:n},s=Object.keys(a).filter(c=>D(a[c])!==D(we?.[c])),d=D(r)!==D(we?.cancellationPolicy);try{if(await api("POST","/api/crm/hotel-info",{name:t,subtitle:i,address:o,phone:n,cancellationPolicy:r}),t&&(g.activeHotelName=t),toast(e==="policy"?"Checkout banner saved!":"Property info saved!","success"),we={...Object.fromEntries(Object.entries(a).map(([c,f])=>[c,D(f)])),cancellationPolicy:D(r)},Pe(e==="policy"?"checkout-policy":"header",{hotelName:t||"",changedFields:e==="policy"?d?["cancellationPolicy"]:["checkout-policy"]:s.length?s:["header"]}),e==="header"){const c=new Set(["name","subtitle","address","phone"]),f=s.length===1&&c.has(s[0])?`header-${s[0]}`:"header";ae(f)}else e==="policy"&&ae("checkout-policy")}catch{toast("Failed to save","error")}}async function rr(){const e=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,i=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:i}),localStorage.setItem("ratesChanged","1"),g.launchStatus=null,ge(),toast("Rates saved!","success"),ae("room",g.editRooms[0]?.id||"")}catch{toast("Failed to save rates","error")}}async function ar(){const e=document.getElementById("edit-new-pin")?.value.trim();if(!e||e.length<6){toast("PIN must be at least 6 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");g.token=e,g.isMasterPin=!1,g.isDogfoodPreview=!1;try{localStorage.setItem("crmToken",g.token)}catch{}toast("PIN updated!","success")}catch(t){toast(t.message||"Failed to change PIN","error")}}function sr(e){navigator.clipboard.writeText(e).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function ye(e,t,{open:i=!1,hint:o="",id:n=""}={}){return`<div class="booking-card page-section" style="margin-bottom:14px;"${n?` id="${n}"`:""}>
    <div class="page-section-head" onclick="toggleSection(this)">
      <div>
        <div class="page-section-title">${e}</div>
        ${o?`<div class="page-section-hint">${o}</div>`:""}
      </div>
      <span class="accordion-arrow" style="${i?"transform:rotate(90deg);":""}">›</span>
    </div>
    <div class="accordion-body" style="display:${i?"block":"none"};padding:0 18px 18px;">${t}</div>
  </div>`}function dr(e){const t=e.nextElementSibling;if(!t)return;const i=e.querySelector(".accordion-arrow"),o=t.style.display==="none"||!t.style.display;t._sectionTimer&&(clearTimeout(t._sectionTimer),t._sectionTimer=null),t.classList.remove("is-animating","is-opening","is-collapsed"),t.style.removeProperty("height"),t.style.removeProperty("transition"),t.style.removeProperty("will-change"),t.style.display=o?"block":"none",i&&(i.style.transform=o?"rotate(90deg)":"rotate(0deg)")}let xe=!1;function Io(){if(document.getElementById("goLiveOverlay"))return;const e=document.createElement("div");e.id="goLiveOverlay",e.style.cssText="position:fixed;inset:0;z-index:100010;background:rgba(255,255,255,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",e.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(e)}function ut(){const e=document.getElementById("goLiveOverlay");e&&e.remove()}function no(e){let t=document.getElementById("goLiveOverlay");t||(t=document.createElement("div"),t.id="goLiveOverlay",document.body.appendChild(t)),t.style.cssText="position:fixed;inset:0;z-index:100020;background:rgba(15,23,20,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;",t.innerHTML=`<div role="alertdialog" aria-modal="true" aria-labelledby="goLiveErrorTitle" style="width:min(100%,420px);background:#fff;border:1px solid #d8e4dc;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(15,23,20,.28);text-align:center;box-sizing:border-box;">
    <div aria-hidden="true" style="width:44px;height:44px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#fff7ed;color:#9a3412;font-size:22px;font-weight:800;">!</div>
    <div id="goLiveErrorTitle" style="font-size:20px;font-weight:800;color:#1a2b22;line-height:1.2;">Checkout couldn't open</div>
    <div style="font-size:14px;line-height:1.55;color:#5f7066;margin:9px auto 18px;max-width:330px;">Your setup is saved. Try again, or contact us if secure checkout still won't open.</div>
    <button type="button" id="goLiveRetry" style="width:100%;min-height:48px;border:0;border-radius:14px;background:#2e7d5b;color:#fff;font:700 15px inherit;cursor:pointer;">Try secure checkout again</button>
    <button type="button" id="goLiveDismiss" style="width:100%;min-height:44px;margin-top:5px;border:0;background:transparent;color:#607168;font:700 13px inherit;cursor:pointer;">Back to activation</button>
    <a href="mailto:support@bookmarketel.com?subject=Marketel%20checkout%20help" style="display:inline-block;margin-top:8px;color:#2e7d5b;font-size:12px;font-weight:700;text-decoration:none;">Contact support</a>
  </div>`,t.querySelector("#goLiveDismiss")?.addEventListener("click",ut),t.querySelector("#goLiveRetry")?.addEventListener("click",()=>{ut(),e?.()})}async function pt(e={}){if(H()){toast("Front Desk app access is managed with your Marketel account.","info");return}try{if(sessionStorage.getItem(`marketelActivationPendingV1.${g.activeHotelId}`)==="1"){So();return}}catch{}if(xe)return;const t=e?.billingInterval==="year"?"year":"month",i=t==="year"?1990:199;xe=!0,Io();const o=window.MarketelJourney;o?.track("JourneyCheckoutRequested",{source:document.getElementById("marketelValueReveal")?"value-reveal":"frontdesk",price:i,currency:"USD",billingInterval:t},{immediate:!0});const n=o?.getContext?.()||{},r=o?.linkage?.()||{};try{const a=await api("POST","/api/crm/go-live",{...r,journeyVisitorId:r.journeyVisitorId||n.visitorId||"",journeySessionId:r.journeySessionId||n.sessionId||"",journeySequence:r.journeySequence||n.sequence||null,billingInterval:t});if(a.success&&a.url){o?.track("JourneyCheckoutRedirected",{provider:"stripe",price:i,currency:"USD",billingInterval:t},{immediate:!0,keepalive:!0}),window.location.href=a.url;return}o?.track("JourneyCheckoutFailed",{stage:"create-checkout-session",reason:"server-rejected",serverMessage:String(a?.message||"").slice(0,160)},{immediate:!0}),xe=!1,no(()=>pt(e))}catch(a){o?.track("JourneyCheckoutFailed",{stage:"create-checkout-session",reason:"network-or-server-error",errorName:String(a?.name||"").slice(0,80)},{immediate:!0}),xe=!1,no(()=>pt(e))}}async function lr(){if(typeof window.openMarketelBillingPortal=="function"){await window.openMarketelBillingPortal();return}try{const e=await api("GET","/api/crm/billing-portal");e.success&&e.url?H()&&typeof window.openInAppBrowser=="function"?window.openInAppBrowser(e.url):window.location.href=e.url:e.reason==="not-stripe-managed"?toast(e.message||"This account is billed directly by Marketel."):toast(e.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function cr(){if(!confirm("Delete this Marketel account and all property data? The subscription will be canceled when deletion completes."))return;const e=prompt("Type DELETE to schedule permanent deletion after a seven-day recovery window.");if(String(e||"").trim().toUpperCase()==="DELETE")try{const t=await api("POST","/api/crm/account-deletion/request",{confirmation:"DELETE"});if(!t?.success)throw new Error(t?.message||"Could not schedule deletion.");toast("Account deletion scheduled. You can cancel during the next seven days.","success"),setTimeout(()=>window.location.reload(),900)}catch(t){toast(t.message||"Could not schedule account deletion.","error")}}async function ur(){try{const e=await api("POST","/api/crm/account-deletion/cancel");if(!e?.success)throw new Error(e?.message||"Could not cancel deletion.");toast("Account deletion cancelled.","success"),setTimeout(()=>window.location.reload(),700)}catch(e){toast(e.message||"Could not cancel account deletion.","error")}}async function pr(){window.openMarketelSupport?.()}async function gr(e){const t=g.editRooms.find(d=>d.id===e);if(!t){toast("Room not found — try refreshing","error");return}const i=document.getElementById("edit-name-"+e)?.value.trim(),o=document.getElementById("edit-desc-"+e)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+e)?.value)||4,r=parseInt(document.getElementById("edit-units-"+e)?.value)||1,a={id:e,name:i||t.name,description:o||"",amenities:t.amenities||"",maxOccupancy:n,totalUnits:r},s=["name","description","amenities","maxOccupancy","totalUnits"].filter(d=>D(a[d])!==D(t[d]));try{const d=await api("POST","/api/crm/rooms",a);if(d&&d.success===!1){toast(d.message||"Failed to save","error");return}t.name=a.name,t.description=a.description,t.maxOccupancy=n,t.totalUnits=r,toast("Room saved!","success"),Pe("room",{roomId:e,roomName:a.name,changedFields:s.length?s:["room"]}),ae("room",e)}catch(d){toast("Failed to save: "+(d.message||""),"error")}}async function fr(e,t){const i=Array.from(e.target.files);if(!i.length)return;const n=document.getElementById("edit-card-"+t)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+t+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+t+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+i.length+"</div></div>"));let r=0,a="";for(const d of i){try{const f=await yt(t,d);if(f.image){const y=g.editRooms.find(k=>k.id===t);y&&(y.images||(y.images=[]),y.images.push(f.image),y.imageUrl||(y.imageUrl=f.image.url)),r++}}catch(f){a=f.message||"Upload failed"}const c=document.getElementById("upload-progress-"+t);c&&(c.textContent=r+" / "+i.length)}const s=document.getElementById("upload-spinner-"+t);s&&s.remove(),W(),r>0&&(g.launchStatus=null),ge(),r>0?(Pe("room-photos",{roomId:t,changedFields:["photos"]}),toast(r+" photo"+(r!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"),ae("room-photo",t)):toast(a||"Upload failed","error")}function Mo(e,t=512){return new Promise((i,o)=>{const n=new Image,r=URL.createObjectURL(e);n.onload=()=>{try{const a=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-a)/2,d=(n.naturalHeight-a)/2,c=document.createElement("canvas");c.width=t,c.height=t;const f=c.getContext("2d");f.imageSmoothingQuality="high",f.drawImage(n,s,d,a,a,0,0,t,t),URL.revokeObjectURL(r),c.toBlob(y=>y?i(y):o(new Error("crop failed")),"image/png",.92)}catch(a){URL.revokeObjectURL(r),o(a)}},n.onerror=()=>{URL.revokeObjectURL(r),o(new Error("load failed"))},n.src=r})}function Po(){const e=document.getElementById("appsAppIconPreview");e&&(e.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function Et(e){const t=document.getElementById("appsAppIconPreview");t&&(t.style.background="#fff",t.style.border="1px solid var(--border)",t.style.padding="0",t.innerHTML='<img src="'+e+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function gt(){const e=document.getElementById("appsAppIconPreview");if(!e)return;if(g.activeHotelAppIcon){Et(g.activeHotelAppIcon);return}const t=(g.activeHotelName||"P").trim().charAt(0).toUpperCase()||"P";e.style.background="transparent",e.style.border="none",e.style.padding="0",e.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+t+"</span>"}async function mr(e){const t=e.files&&e.files[0];if(!t)return;Po();const i=new FormData;try{const o=await Mo(t,512);i.append("icon",o,"app-icon.png")}catch{i.append("icon",t)}try{const o=ht(),n=new URLSearchParams;g.activeHotelId&&n.set("hotelId",g.activeHotelId);const a=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":o,...H()?{"x-marketel-client":"ios"}:{}},body:i})).json();if(a.success&&a.appIconUrl){g.activeHotelAppIcon=a.appIconUrl,Et(a.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(g.activeHotelId||"")+"|"+a.appIconUrl+"|"+(g.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Guestel icon updated.","success")}else toast(a.message||"Failed to upload icon","error"),gt()}catch{toast("Failed to upload icon","error"),gt()}e.value=""}async function hr(e,t){if(!confirm("Delete this photo?"))return;const i=document.querySelector(`[data-thumb-id="${CSS.escape(String(t))}"]`),o=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;i&&!o&&(i.classList.add("marketel-removing"),setTimeout(()=>{i.style.transition="width 140ms var(--ease-in-out), margin 140ms var(--ease-in-out)",i.style.width="0px",i.style.margin="0"},120));try{await api("DELETE",`/api/crm/rooms/${e}/images/${t}`);const n=g.editRooms.find(r=>r.id===e);n&&n.images&&(n.images=n.images.filter(r=>r.id!==t),n.imageUrl=n.images[0]?.url||null),W(),toast("Photo deleted","success"),Pe("room-photo-deleted",{roomId:e,changedFields:["photos"]}),ae("room-photo",e)}catch{i&&(i.classList.remove("marketel-removing"),i.style.transition="",i.style.width="",i.style.margin=""),toast("Failed to delete","error")}}async function yr(e){if(!confirm("Delete this room from your booking page and Availability? Saved date changes will also be removed."))return;const t=g.editRooms.find(i=>i.id===e);try{if(await api("DELETE",`/api/crm/rooms/${e}`),g.editRooms=g.editRooms.filter(o=>o.id!==e),t){const o=g.manualAvailability||{rooms:[],overrides:{}};o.rooms=(o.rooms||[]).filter(n=>n.name!==t.name),o.overrides=Object.fromEntries(Object.entries(o.overrides||{}).filter(([n])=>!n.startsWith(`${t.name}|`))),g.manualAvailability=o,g.manualSelectedRoom===t.name&&(g.manualSelectedRoom=o.rooms[0]?.name||"")}W(),window.refreshRoomBadge?.(),window.renderAvailabilityView?.(),toast("Room deleted","success"),vt({render:!0}).catch(()=>{}),window.loadManualAvailability?.({silent:!0})?.catch(()=>{})}catch(i){toast(i.message||"Failed to delete","error")}}function xr(){document.getElementById("editAddRoomModal")||(document.body.insertAdjacentHTML("beforeend",`
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
  `),window.setNativeModalOpen?.("edit-add-room",!0),requestAnimationFrame(()=>document.getElementById("editNewRoomName")?.focus()))}function Ro(){document.getElementById("editAddRoomModal")?.remove(),window.setNativeModalOpen?.("edit-add-room",!1)}async function vr(){const e=document.getElementById("editNewRoomName"),t=document.querySelector("#editAddRoomModal .edit-add-room-actions .primary"),i=e?.value.trim()||"";if(!i)return;e&&(e.disabled=!0),t&&(t.disabled=!0,t.textContent="Adding…");const o=5;try{const n=await api("POST","/api/crm/rooms",{name:i,maxOccupancy:4,totalUnits:o});if(!n?.success||!n.room?.id)throw new Error(n?.message||"Failed to add room");const r={id:n.room.id,name:n.room.name||i,description:"",amenities:"",maxOccupancy:4,totalUnits:o,imageUrl:null,images:[]},a=g.editRooms.findIndex(c=>c.id===r.id);a>=0?g.editRooms=g.editRooms.map((c,f)=>f===a?r:c):g.editRooms=[...g.editRooms,r];const s=g.manualAvailability||{rooms:[],overrides:{}};Array.isArray(s.rooms)||(s.rooms=[]),(!s.overrides||typeof s.overrides!="object")&&(s.overrides={}),s.rooms.some(c=>c.name===r.name)||(s.rooms=[...s.rooms,{name:r.name,totalUnits:o}].sort((c,f)=>String(c.name).localeCompare(String(f.name)))),g.manualAvailability=s,g.manualSelectedRoom||(g.manualSelectedRoom=r.name),Ro(),W(),window.refreshRoomBadge?.(),toast("Room added","success"),vt({render:!0}).catch(()=>{}),window.loadManualAvailability?.({silent:!0})?.catch(()=>{})}catch(n){e&&(e.disabled=!1),t&&(t.disabled=!1,t.textContent="Add room"),toast(n.message||"Failed to add room","error")}}const zo={addAmenityPrompt:or,advanceTourIfNeeded:ge,changePin:ar,checklistGoTo:Fn,checklistGoToRates:Dn,cleanupPostActivationTourUi:Te,cleanupSettingsTourUi:Y,cancelAccountDeletion:ur,closeAmenityPicker:Ie,closeCustomAmenityModal:Re,closeEditAddRoom:Ro,confirmAmenityPicker:tr,confirmCustomAmenity:Xn,confirmEditAddRoom:vr,copyBookingLink:sr,copyBookingLinkFromChecklist:$n,deleteEditImage:hr,deleteEditRoom:yr,ensureTourBlurOverlay:N,finishPostActivationTour:ke,getAmenityIcon:Co,getCrmAuthToken:ht,getEditRoomImages:Bo,goLive:pt,guestBookingEngineUrl:wo,handoffToGuestAppsTour:fo,hideGoLiveOverlay:ut,loadEditRooms:Gn,loadSettings:vo,openAmenityPicker:To,openCustomAmenityModal:Zn,openBillingPortal:lr,openEditAddRoom:xr,openGuestBookingEngine:jn,openPreviewSite:bo,openTourAccordion:ne,postRoomImageUpload:yt,queryTourSelector:J,requestAccountDeletion:cr,removeAmenity:ir,removeCustomAmenity:er,renderEditRooms:xt,renderEditRoomsCards:W,refreshEditRoomsData:vt,replayWalkthrough:Yn,resolveLiveTourElement:be,resolveTourHighlightEl:ce,restoreAppIconPreview:gt,saveEditRoom:gr,saveHotelInfo:nr,saveRates:rr,scrollTourTargetIntoView:go,sendSupportMessage:pr,setAppIconPreviewImage:Et,setAppIconPreviewLoading:Po,settingsChangePin:qn,settingsCopyLink:Ln,settingsSaveRates:Nn,settingsSendSupport:Hn,settingsUploadPhoto:On,showActivatedModal:So,showEditRoomPhoto:Ao,showFinaleMockModal:ue,showGoLiveOverlay:Io,showOnboardingQuestions:Vn,showTestDriveModal:mo,showWelcomeModal:ko,squareCropImage:Mo,startPostActivationTabTour:Eo,startSettingsTour:lt,stepEditRoomPhoto:Wn,toggleAmenityPreset:Jn,toggleSection:dr,tourAnchorRect:po,tourElementRect:Ae,updatePreviewSiteBar:_n,uploadAppIcon:mr,uploadEditImages:fr};function br(){rn(zo)}const Sr=Object.freeze(Object.defineProperty({__proto__:null,default:zo,install:br},Symbol.toStringTag,{value:"Module"}));export{ni as Q,Sn as a,En as b,g as c,wr as d,rn as e,an as f,Sr as g,Er as i,kr as s,$e as t};
