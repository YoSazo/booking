const d={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let O=null;function ot(){return typeof lucide<"u"?Promise.resolve():O||(O=new Promise((e,t)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>e(),o.onerror=()=>t(new Error("lucide load failed")),document.head.appendChild(o)}),O)}async function be(e){if(!e||!e.type.startsWith("image/")||e.type==="image/webp"&&e.size<4e5)return e;try{const t=await createImageBitmap(e),o=1600,i=1200;let n=t.width,a=t.height;const r=Math.min(1,o/n,i/a);n=Math.round(n*r),a=Math.round(a*r);const s=document.createElement("canvas");s.width=n,s.height=a,s.getContext("2d").drawImage(t,0,0,n,a),t.close();const u=await new Promise((x,w)=>{s.toBlob(E=>E?x(E):w(new Error("encode failed")),"image/webp",.82)}),g=(e.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([u],g+".webp",{type:"image/webp"})}catch{return e}}function it(){const e=()=>{d.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(e,{timeout:2500}):setTimeout(e,600)}function we(e){Object.assign(window,e)}async function ne(){const e=document.getElementById("settingsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const t=await api("GET","/api/crm/verify"),i="https://"+(t?.domain||d.activeHotelId+".mktel.co"),n="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),a=await api("GET","/api/crm/rooms");let r={nightly:69,weekly:299,monthly:999};a?.rates&&(r=a.rates);const s=a?.rooms||[];let u="";t?.subscribed||(u+=goLiveInlineCardHtml()),s.length?s.forEach(g=>{const x=g.images&&g.images.length>0;u+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${x?`<img src="${g.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${x?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${g.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${g.name}</div>
              ${g.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${g.description}</div>`:""}
            </div>
          </div>
        `}):u+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${i}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${i}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${n}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${r.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${r.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${r.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `,u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,t?.subscribed&&(u+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),u+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `,e.innerHTML=u}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function ke(){const e=document.getElementById("settings-booking-url");e&&navigator.clipboard.writeText(e.value).then(()=>{localStorage.setItem("linkCopied","1"),M(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function Ee(){localStorage.setItem("settingsTourDone","1");const e=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",e);let t=0;const o=setInterval(()=>{t++;const i=document.getElementById("edit-rate-nightly");if(i||t>20){if(clearInterval(o),!i)return;const n=i.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const a=n.previousElementSibling?.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const r=i.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${r.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const u=document.getElementById("checklistPointer");u&&u.remove()},6e3)},1e3)},100)}},200)}function Se(){const t="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(t).then(()=>{localStorage.setItem("linkCopied","1"),M(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function Be(e,t){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const n=setInterval(()=>{i++;const a=document.querySelector(e);if(a||i>20){if(clearInterval(n),!a)return;a.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const s=a.getBoundingClientRect(),u=document.createElement("div");u.id="checklistPointer",u.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,u.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${t}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(u),setTimeout(()=>{const g=document.getElementById("checklistPointer");g&&g.remove()},6e3)},1e3)}},200)}function K(){const e=String(d.token||localStorage.getItem("crmToken")||"").trim();return e&&(d.token=e),e}async function X(e,t){const o=K();if(!o)throw new Error("Not logged in");const i=await be(t),n=new FormData;n.append("image",i,i.name||"room.webp");const a=new URLSearchParams;d.activeHotelId&&a.set("hotelId",d.activeHotelId),a.set("token",o);const r=await fetch(`/api/crm/rooms/${e}/images?${a}`,{method:"POST",headers:{"x-crm-token":o},body:n}),s=await r.json().catch(()=>({}));if(!r.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${r.status})`);return s}async function Te(e,t){const o=e.target.files[0];if(o)try{await X(t,o),toast("Photo uploaded!","success"),ne()}catch(i){toast(i.message||"Upload failed","error")}}async function ze(){const e=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function Ie(){const e=document.getElementById("settings-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(t){toast(t.message||"Failed to change PIN","error")}}async function Pe(){const e=document.getElementById("settings-support-msg")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function Ae(){const e=d.activeHotelDomain||d.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(d.activeHotelId)+"&preview=1":"https://"+e+"?preview=1";window.open(o,"_blank")}function re(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&d.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(d.activeHotelId);const t=d.activeHotelDomain||"";return t?"https://"+t+"/":""}function Ce(){const e=re();if(!e){toast("Your booking domain is still setting up.","info");return}window.open(e,"_blank")}function Re(){const e=document.getElementById("previewSiteBar");e&&(e.style.display=d.currentFilter==="settings"?"block":"none")}function M(){if(localStorage.getItem("settingsTourDone"))return;const e=parseInt(localStorage.getItem("settingsTourStep")||"0"),t=d.editRooms.some(r=>r.images&&r.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");e===2&&t&&localStorage.setItem("settingsTourStep","3"),e===3&&o&&localStorage.setItem("settingsTourStep","4"),e===4&&i&&localStorage.setItem("settingsTourStep","5");const n=document.getElementById("tourTooltip");n&&n.remove();const a=document.getElementById("tourBlurOverlay");a&&a.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex="",r.style.isolation="",r.style.boxShadow="",r.style.outline=r.dataset.tourOrigOutline||"",r.style.outlineOffset=r.dataset.tourOrigOutlineOffset||"",r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition,delete r.dataset.tourOrigOutline,delete r.dataset.tourOrigOutlineOffset}),document.body.style.overflow=""}function Me(){let e=0;const t={},o=[{title:"Why do you want a booking page?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),e>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",t).catch(()=>{})}catch{}ae();return}const a=o[e],r=document.createElement("div");r.id="onboardingOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",a.type==="text"?(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${a.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${a.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(r),document.getElementById("onboardingTextSubmit").onclick=()=>{const s=document.getElementById("onboardingTextInput").value.trim();s&&(t[a.key]=s,e++,i())}):(r.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${a.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${a.options.map(s=>`
              <button class="onboarding-opt" data-value="${s.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${s.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(r),r.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{t[a.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{e++,i()},250)})}))}i()}function Le(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(o=>{localStorage.removeItem(o)});const e=new URL(window.location.href);e.searchParams.set("welcome","1"),e.searchParams.delete("tab");const t=e.pathname+e.search+e.hash;if(t===window.location.pathname+window.location.search+window.location.hash){window.location.reload();return}window.location.assign(t)}function ae(){const e=document.createElement("div");e.id="welcomeModalOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function t(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const i=typeof _=="function"?_:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),e.remove()}function o(){e.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏨</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=t}document.body.appendChild(e),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function N(){const e=document.getElementById("postActivationTourTooltip");e&&e.remove();const t=document.getElementById("postActivationTourOverlay");t&&t.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function F(){N(),localStorage.setItem("postActivationTourDone","1");const e=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",e)}catch{}}function Z(){if(localStorage.getItem("postActivationTourDone")){F();return}N();const e=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. You'll get a push alert for each new one."},{tab:"apps",navFilter:"apps",text:"<strong>Guest App</strong> — put your hotel on guests&apos; home screens and send install reminders."}];let t=0;function o(){if(N(),t>=e.length){F();return}const i=e[t],n=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);n&&setFilter(i.tab,n);const a=document.createElement("div");a.id="postActivationTourOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(a),document.body.style.overflow="hidden",setTimeout(()=>{const r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&(r.setAttribute("data-post-activation-highlight","1"),r.style.position="relative",r.style.zIndex="100003",r.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",r.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=r?r.getBoundingClientRect():{left:24,bottom:80,width:200},u=document.createElement("div");u.id="postActivationTourTooltip";const g=Math.min(300,window.innerWidth-32),x=Math.max(16,Math.min(s.left+s.width/2-g/2,window.innerWidth-g-16)),w=Math.min(s.bottom+14,window.innerHeight-180);u.style.cssText=`position:fixed;z-index:100004;left:${x}px;top:${w}px;max-width:${g}px;width:${g}px;`;const E=t>=e.length-1;u.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${t+1} / ${e.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${E?"Got it — open Guest App":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(u),document.getElementById("postActivationTourNext").onclick=()=>{t+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{F()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=Z;function $e(){if(document.getElementById("activatedModalOverlay"))return;const e=d.activeHotelDomain||(d.activeHotelId?d.activeHotelId+".mktel.co":""),t="Bookings and Guest App",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
    <div style="background:white;border-radius:20px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#2E7D5B 0%,#1a5c3f 100%);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">🎉</div>
      <h2 style="font-size:21px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">You're live — payment received</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 18px;">Thank you! Your subscription is active and your booking page is now switched on.</p>
      <div style="text-align:left;background:#f0f7f3;border:1px solid #d6e9df;border-radius:14px;padding:16px 18px;margin-bottom:18px;">
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>Guests can now book.</strong> The paywall is gone — reservations go through on your page immediately.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>New bookings appear in Bookings</strong> — you'll get a notification for each one.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>${t}</strong> are now part of your daily workflow.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>A receipt is on its way</strong> to your email from Stripe.</span>
        </div>
      </div>
      ${e?`<p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Your booking page: <strong style="color:#2E7D5B;">${e}</strong></p>`:""}
      <button id="activatedModalTour" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Quick tour →</button>
      <button id="activatedModalSkip" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid #d6e9df;background:#fff;color:#6b7280;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Skip — go to Bookings</button>
    </div>
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),Z()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}function A(e){const t=e||{};let o=document.getElementById("tourBlurOverlay");return o||(o=document.createElement("div"),o.id="tourBlurOverlay",o.style.cssText=`position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.48);pointer-events:${t.blockPointer?"auto":"none"};`,document.body.appendChild(o),t.lockScroll&&(document.body.style.overflow="hidden"),o)}function U(){const e=document.getElementById("tourTooltip");e&&e.remove();const t=document.getElementById("tourBlurOverlay");t&&t.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.tourOrigPosition||"",i.style.zIndex="",i.style.isolation="",i.style.boxShadow="",i.style.outline=i.dataset.tourOrigOutline||"",i.style.outlineOffset=i.dataset.tourOrigOutlineOffset||"",i.removeAttribute("data-tour-highlighted"),delete i.dataset.tourOrigPosition,delete i.dataset.tourOrigOutline,delete i.dataset.tourOrigOutlineOffset});const o=document.getElementById("goLiveBanner");o&&o.dataset.tourHidden&&(delete o.dataset.tourHidden,typeof updateGoLiveBanner=="function"&&updateGoLiveBanner()),document.body.style.overflow=""}function I(e,t){if(!t.openAccordion)return;const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const a=o.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}}function P(e){if(!e)return null;for(const t of String(e).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(t);if(o&&o.isConnected)return o}return null}function C(e,t){if(t.highlightSelector){const o=P(t.highlightSelector);if(o)return o}if(t.highlightCard){const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(o)return o}return t.targetParent&&(e.closest(".booking-card")||e.closest(".accordion-body"))||e}function H(e,t){if(!t)return e;const o=String(t.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const n=document.querySelector(i);if(n&&n.isConnected)return n}if(t.accordionCard){const i=document.querySelector(t.accordionCard);if(i&&i.isConnected)return i}return e&&e.isConnected?e:null}function W(e,t){if(!e||!e.isConnected)return null;const o=e.getBoundingClientRect();return o.width<2||o.height<2||!t&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function Y(e,t){const o=P(e.anchorSelector);if(o){const i=W(o,!0);if(i)return i}return W(t,!0)}function q(e){const t=e||"auto";try{window.scrollTo({top:0,left:0,behavior:t})}catch{}const o=document.scrollingElement||document.documentElement;o&&(o.scrollTop=0),document.documentElement.scrollTop=0,document.body.scrollTop=0,["#editView","#settingsView","#app .container"].forEach(i=>{const n=document.querySelector(i);n&&(n.scrollTop=0)})}function se(e,t){const o=t.scrollTarget||t.accordionCard,i=(o?P(o):null)||e;if(!i&&!t.scrollToTop)return Promise.resolve();const n=t.scrollBlock||"center",a=window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=d.settingsTourActive||a?"auto":"smooth";return new Promise(s=>{const u=()=>{const B=t.scrollPadTop??80,l=t.scrollPadBottom??220,c=P(t.anchorSelector)||(i&&i.isConnected?i:null)||(e&&e.isConnected?e:null);if(!c){s();return}const m=c.getBoundingClientRect();m.top<B&&window.scrollBy({top:m.top-B,left:0,behavior:"auto"}),m.bottom>window.innerHeight-l&&window.scrollBy({top:m.bottom-window.innerHeight+l,left:0,behavior:"auto"}),requestAnimationFrame(()=>requestAnimationFrame(s))},g=()=>{i&&i.scrollIntoView({behavior:t.scrollToTop?"auto":r,block:n,inline:"nearest"}),u()};if(t.scrollToTop){if(q(r),t.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(()=>{t.forcePageTop&&q("auto"),s()}));return}if(r==="auto"){g();return}let B=!1;const l=()=>{B||(B=!0,window.removeEventListener("scrollend",c),clearTimeout(m),g())},c=()=>l();"onscrollend"in window&&window.addEventListener("scrollend",c,{once:!0});const m=setTimeout(l,520);return}if(!i){s();return}if(i.scrollIntoView({behavior:r,block:n,inline:"nearest"}),r==="auto"){u();return}let x=!1;const w=()=>{x||(x=!0,window.removeEventListener("scrollend",E),clearTimeout(G),u())},E=()=>w();"onscrollend"in window&&window.addEventListener("scrollend",E,{once:!0});const G=setTimeout(w,620)})}function de(){U(),localStorage.setItem("settingsTourStep","handoff");const e=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&setFilter("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},t=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof t=="function"?t().then(e).catch(e):e()}function R(){d.settingsTourActive=!1,updateGoLiveBanner();const e=document.createElement("div");e.id="tourBlurOverlay",e.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(e),document.body.style.overflow="hidden";const t=document.createElement("div");if(t.id="tourTooltip",t.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
      <div style="padding:24px 20px;text-align:center;">
        <div style="margin-bottom:12px;display:flex;justify-content:center;"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
        <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">You're all set!</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 20px;">Your booking page is live. Here's what to do next:</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:14px;border:1px solid #bbf7d0;text-align:left;margin-bottom:16px;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">1️⃣</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;"><strong>Share your booking link</strong> — add it to your Google Business Profile, your website, text it to guests, or run ads to it</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">2️⃣</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;"><strong>Wait for your first booking</strong> — you'll see it appear right here</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">3️⃣</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;"><strong>Call the guest</strong> to confirm and collect payment at check-in</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;">📲</span>
              <span style="font-size:13px;color:#166534;line-height:1.4;"><strong>Later:</strong> open <strong>Guest App</strong> for your check-in QR and guest install tools</span>
            </div>
          </div>
        </div>
        <div style="background:#fff7ed;border-radius:10px;padding:10px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
          <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">⚠️ We're not an ad agency — you won't get bookings unless you get your link in front of people.</p>
        </div>
        <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy my link & let's go!</button>
      </div>
    </div>`,document.body.appendChild(t),!document.getElementById("tourModalAnimStyle")){const o=document.createElement("style");o.id="tourModalAnimStyle",o.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(o)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const i="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(i).catch(()=>{}),U(),d.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),toast("Booking link copied!","success"),finishTourHydration(),le()}}function le(e){const t=document.createElement("div");t.id="testDriveOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
      <div style="padding:28px 22px;text-align:center;">
        <div style="margin-bottom:12px;display:flex;justify-content:center;"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
        <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">Go live and start accepting bookings</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 20px;">Your booking page is built. Your link is copied. Activate to let guests book.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:14px;border:1px solid #bbf7d0;text-align:left;margin-bottom:20px;">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;"><span style="color:#2E7D5B;font-weight:700;">✓</span><span style="font-size:13px;color:#166534;">Your booking page goes live</span></div>
            <div style="display:flex;align-items:center;gap:8px;"><span style="color:#2E7D5B;font-weight:700;">✓</span><span style="font-size:13px;color:#166534;">Card verification prevents no-shows</span></div>
            <div style="display:flex;align-items:center;gap:8px;"><span style="color:#2E7D5B;font-weight:700;">✓</span><span style="font-size:13px;color:#166534;">Get notified when bookings come in</span></div>
            <div style="display:flex;align-items:center;gap:8px;"><span style="color:#2E7D5B;font-weight:700;">✓</span><span style="font-size:13px;color:#166534;">No commission — ever</span></div>
          </div>
        </div>
        <button id="activateNowBtn" style="width:100%;padding:16px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">$199/mo — Go Live Now</button>
        <p style="font-size:11px;color:#6b7280;margin:0 0 16px;">Cancel anytime · No contracts</p>
        <button id="activateLaterBtn" style="background:none;border:none;color:#9ca3af;font-size:12px;font-family:inherit;cursor:pointer;padding:6px 12px;">Not ready yet — keep my page inactive</button>
      </div>
    </div>`,document.body.appendChild(t),typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("activateNowBtn").onclick=()=>{t.remove(),fe()},document.getElementById("activateLaterBtn").onclick=()=>{t.remove();const o=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');o&&setFilter("bookings",o)}}function _(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),R();return}d.settingsTourActive=!0,updateGoLiveBanner(),seedTourRevenueShell();const e=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');e&&setFilter("settings",e);function t(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!d.editRoomsLoadPromise)return;const m=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;m&&m()}t();const o=[{target:"",text:"",openAccordion:!1,tab:"settings",customModal:"homescreen"},{target:"#tour-header-preview-card",highlightSelector:"#tour-header-preview-card",anchorSelector:"#tour-header-preview-card",scrollTarget:"#tour-header-preview-card",title:"Edit your booking page",text:"Tap any field on this page to change it: hotel name, address, phone, room details, photos, and prices. What you edit here is what guests see.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:96,scrollPadBottom:220},{target:'#editRoomsCards [data-tour-room-card="1"]',highlightSelector:'#editRoomsCards [data-tour-room-card="1"]',anchorSelector:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',scrollTarget:'#editRoomsCards [data-tour-room-card="1"] .room-edit-photo',title:"Add room photos",text:"Upload a real room photo here. Guests make faster decisions when they can see the room before they book.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:96,scrollPadBottom:240},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-header",scrollTarget:"#tour-rates-card",title:"Set your rates",text:"Set nightly, weekly, and monthly prices here. Guests book from these rates on your direct booking page.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:260},{target:"#tour-preview-btn",highlightSelector:"#tour-preview-btn",anchorSelector:"#tour-preview-btn",scrollTarget:"#tour-preview-btn",title:"Preview and share it",text:"Use Preview to see exactly what guests see. Your booking link and QR code are on this page too, so you can send guests straight here.",openAccordion:!1,tab:"settings",scrollBlock:"start",scrollPadTop:96,scrollPadBottom:240},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",title:"Track revenue and payment status",text:"Revenue shows direct bookings and estimated OTA commission savings. Guest cards are verified to reduce no-shows, but you still collect payment at check-in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,scrollBlock:"start",scrollPadTop:92,scrollPadBottom:220},{target:"",text:"",openAccordion:!1,tab:"apps",customModal:"guestAppsStory"}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function n(){U()}function a(){n(),localStorage.removeItem("settingsTourStep"),R()}function r(l){if(l.customModal){u(l);return}requestAnimationFrame(()=>u(l))}function s(){if(n(),i>=o.length){localStorage.removeItem("settingsTourStep"),R();return}const l=o[i];if(l.tab==="revenue"&&!d.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(l.tab==="apps"&&!(isStandaloneApp()||d.frontdeskInstalled)&&l.target&&!l.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(l.customModal||A(),l.tab&&l.tab!==d.currentFilter){const c=document.querySelector(`.tab[data-nav-filter="${l.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${l.tab}"]`);if(c&&setFilter(l.tab,c),l.tab==="apps"){const m=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof m=="function"&&m(!0)}r(l);return}r(l)}function u(l){if(l.customModal==="homescreen"){E();return}if(l.customModal===!0||l.customModal==="bookings"){B();return}if(l.customModal==="availability"){G();return}if(l.customModal==="finale"){R();return}if(l.customModal==="guestAppsStory"){de();return}if(l.waitForVisible){const p=l.target.split(",").map(h=>h.trim());let v=0;const f=30;A();const b=d.settingsTourActive?60:200,y=()=>{if(v++,l.tab==="apps"){const k=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof k=="function"&&k(!0)}let h=null;for(const k of p)if(h=document.querySelector(k),h)break;if(h&&(l.openAccordion&&I(h,l),l.openAccordion||h.offsetParent!==null)){g(h,l);return}v<f?setTimeout(y,b):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};y();return}function c(p){const v=p.target.split(",").map(f=>f.trim());for(const f of v){const b=document.querySelector(f);if(b&&!(!p.openAccordion&&b.offsetParent===null&&getComputedStyle(b).position!=="fixed"))return b}if(p.accordionCard){const f=document.querySelector(p.accordionCard);if(f)return f}return null}function m(p,v){const f=c(p);if(f){v(f);return}const b=p.tab==="settings"&&!p.customModal&&p.target,y=p.tab==="apps"&&!p.customModal&&p.target;if(!b&&!y){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}A();let h=0;if(b&&t(),y){const T=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof T=="function"&&T(!0)}const k=d.settingsTourActive?60:250,S=()=>{if(h++,y){const z=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof z=="function"&&z(!0)}const T=c(p);if(T){v(T);return}if(t(),y){const z=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof z=="function"&&z(!0)}h<48?setTimeout(S,k):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};S()}m(l,p=>g(p,l))}function g(l,c){if(I(l,c),l=C(l,c),(!l||!l.isConnected)&&(l=H(l,c),l&&(l=C(l,c))),!l){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}const m=document.getElementById("goLiveBanner");m&&c.tab==="settings"&&(m.dataset.tourHidden="1",m.style.display="none");const p=l;A(),se(p,c).then(()=>{if(c.forcePageTop&&q("auto"),!p.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}I(p,c),c.noHighlight||(p.dataset.tourOrigPosition||(p.dataset.tourOrigPosition=p.style.position||""),p.dataset.tourOrigOutline||(p.dataset.tourOrigOutline=p.style.outline||""),p.dataset.tourOrigOutlineOffset||(p.dataset.tourOrigOutlineOffset=p.style.outlineOffset||""),p.style.position=p.style.position||"relative",p.style.zIndex="99999",p.style.isolation="isolate",p.style.boxShadow="inset 0 0 0 3px #2E7D5B, 0 0 0 3px #2E7D5B, 0 14px 34px rgba(46,125,91,0.24)",p.style.outline="3px solid #2E7D5B",p.style.outlineOffset="3px",p.setAttribute("data-tour-highlighted","1"));const v=()=>{const y=P(c.anchorSelector)||p;if(c.freezeTooltip){const S=y&&y.isConnected?y.getBoundingClientRect():null;x(y,c,S&&S.width>=2?S:null);return}const h=H(p,c);let k=h?C(h,c):p;I(k,c),c.tooltipAnchor||Y(c,k),x(k||p,c)};if(c.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(v));return}const f=(b=0)=>{requestAnimationFrame(()=>{if(c.forcePageTop&&q("auto"),c.tooltipAnchor){v();return}const y=H(p,c);let h=y?C(y,c):p;if(I(h,c),!Y(c,h)&&b<4){requestAnimationFrame(()=>f(b+1));return}x(h||p,c)})};f(0)})}function x(l,c,m){const p=document.getElementById("tourTooltip");p&&p.remove();const v=document.createElement("div");v.id="tourTooltip";const f=Math.min(i+1,o.length),b=Math.max(8,Math.min(100,Math.round(f/o.length*100))),y=c.title||"Quick setup",h=c.primaryLabel||(i<o.length-1?"Next":"Got it"),k=i<=0;v.style.cssText="position:fixed;z-index:100000;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;pointer-events:none;",v.innerHTML=`
      <div style="pointer-events:auto;width:100%;max-width:560px;background:#fff;color:#1A2B22;border:1.5px solid #D8E4DC;border-radius:16px;box-shadow:0 18px 50px rgba(26,43,34,0.24);padding:14px 14px 13px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7D72;white-space:nowrap;">${f} of ${o.length}</div>
          <div style="height:6px;flex:1;border-radius:999px;background:#E6EEE9;overflow:hidden;">
            <div style="height:100%;width:${b}%;border-radius:999px;background:#2E7D5B;"></div>
          </div>
        </div>
        <div style="font-size:16px;font-weight:800;line-height:1.25;margin-bottom:5px;">${y}</div>
        <p style="font-size:13px;color:#4B5D52;line-height:1.45;margin:0 0 12px;">${c.text}</p>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="tourBackBtn" type="button" ${k?"disabled":""} style="min-height:40px;padding:9px 12px;border-radius:10px;border:1.5px solid #D8E4DC;background:#fff;color:${k?"#A8B5AD":"#1A2B22"};font-family:inherit;font-size:13px;font-weight:700;cursor:${k?"default":"pointer"};">Back</button>
          <button id="tourSkipBtn" type="button" style="min-height:40px;padding:9px 12px;border:none;background:transparent;color:#6B7D72;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Skip</button>
          <button id="tourNextBtn" type="button" style="min-height:40px;margin-left:auto;padding:10px 18px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;">${h}</button>
        </div>
      </div>`,document.body.appendChild(v),w()}function w(){const l=document.getElementById("tourNextBtn"),c=document.getElementById("tourSkipBtn");l&&(l.onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()}),c&&(c.onclick=()=>{a()});const m=document.getElementById("tourBackBtn");m&&(m.onclick=()=>{i<=0||(n(),i--,localStorage.setItem("settingsTourStep",String(i)),s())})}function E(){typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms();const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";const c=d.activeHotelName||"Your Hotel",m=c.trim().charAt(0).toUpperCase(),p=c.length>10?c.slice(0,10):c,v="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",f="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",b="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",y=`<div style="${v}"><div style="${f}background:rgba(255,255,255,0.22);"></div><div style="${b}"></div></div>`,h=d.activeHotelAppIcon||"",k=h?`<img src="${h}" alt="" style="width:100%;height:100%;object-fit:contain;">`:m,S=h?`${f}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${f}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,T=`<div style="${v}"><div style="${S}">${k}</div><div style="${b}font-size:7.5px;color:#fff;font-weight:700;">${p}</div></div>`,z=[y,y,y,y,T,y,y,y].join(""),$=document.createElement("div");if($.id="tourTooltip",$.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",$.innerHTML=`
      <div style="background:white;border-radius:22px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${z}
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
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${c}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your hotel from your booking page or a QR — set that up under <strong>Guest App</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild($),!document.getElementById("tourModalAnimStyle")){const V=document.createElement("style");V.id="tourModalAnimStyle",V.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(V)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}function G(){const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";let c=0;const m=[`<div style="padding:20px 18px 0;">
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
      </div>`],p=document.createElement("div");p.id="tourTooltip",p.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function v(){const b=c>=m.length-1?"Next — Revenue →":"Next →";p.innerHTML=`
        <div style="background:white;border-radius:20px;max-width:340px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
          ${m[c]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${m.map((y,h)=>`<div style="width:8px;height:8px;border-radius:50%;background:${h===c?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${b}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{c<m.length-1?(c++,v()):(n(),i++,localStorage.setItem("settingsTourStep",String(i)),s())},document.getElementById("tourSkipBtn").onclick=()=>{a()}}if(document.body.appendChild(p),v(),!document.getElementById("tourModalAnimStyle")){const f=document.createElement("style");f.id="tourModalAnimStyle",f.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(f)}}function B(){const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";const c=document.createElement("div");if(c.id="tourTooltip",c.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",c.innerHTML=`
      <div style="background:white;border-radius:20px;max-width:340px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
        <div style="padding:20px 18px 0;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#1a1a2e;">When a guest books, it looks like this</div>
          </div>
        </div>
        <!-- Mock booking card -->
        <div style="padding:0 14px 14px;">
          <div style="background:white;border:2px solid #D8E4DC;border-radius:16px;overflow:hidden;">
            <div style="height:5px;background:#2E7D5B;"></div>
            <div style="padding:16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <div>
                  <div style="font-size:16px;font-weight:700;color:#1a1a2e;">Sarah Johnson</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px;">2 minutes ago</div>
                </div>
                <div style="font-size:18px;font-weight:700;color:#2E7D5B;">$284.00</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🛏 King Room</span>
                <span style="background:#f0fdf4;color:#166534;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">🌙 3 nights</span>
                <span style="background:#eff6ff;color:#1e40af;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">💳 Collect at check-in</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px;background:#f8faf9;border-radius:10px;margin-bottom:14px;">
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Check-in</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">Jun 15</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Check-out</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">Jun 18</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;">Guests</div>
                  <div style="font-size:13px;font-weight:700;color:#1a1a2e;margin-top:2px;">2</div>
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <div style="font-size:12px;color:#6b7280;">(555) 867-5309</div>
                <div style="font-size:12px;color:#6b7280;">sarah.j@email.com</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="padding:10px;border-radius:10px;background:#2E7D5B;color:white;font-size:13px;font-weight:700;text-align:center;">📞 Call Now</div>
                <div style="padding:10px;border-radius:10px;background:#f3f4f6;color:#374151;font-size:13px;font-weight:700;text-align:center;">📝 Add Note</div>
              </div>
            </div>
          </div>
        </div>
        <div style="padding:0 18px 20px;text-align:center;">
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Next — Availability →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(c),!document.getElementById("tourModalAnimStyle")){const m=document.createElement("style");m.id="tourModalAnimStyle",m.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(m)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}s()}async function ee(){if(isEditPageDomReady())return;if(d.editRoomsLoadPromise)return d.editRoomsLoadPromise;const e=document.getElementById("editRoomsList");if(e){d.editRoomsLoadPromise=(async()=>{e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!t.rooms)throw new Error("No data");d.editRooms=t.rooms;const i=o?.hotelName||"";i&&(d.activeHotelName=i),o&&(d.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const n=o?.hotelSubtitle||"",a=o?.hotelAddress||"",r=o?.hotelPhone||"",s=o?.appIconUrl||"";d.activeHotelAppIcon=s,updateFrontdeskManifestLink();let u={nightly:69,weekly:299,monthly:999,taxRate:.1};t.rates&&(u=t.rates);const x="https://"+(o?.domain||d.activeHotelId+".mktel.co"),w="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(x);let E=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin:10px 0 14px;scroll-margin-top:96px;">Preview Your Site →</button>
      <div class="booking-card" id="tour-header-preview-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${a}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-name" placeholder="Your Hotel Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${n}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${r}" id="edit-hotel-phone" placeholder="(555) 123-4567" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
        </div>
      </div>
      </div>
      <div class="dash-b">
      ${goLiveInlineCardHtml()}
      ${(typeof twoRoomExplainerHtml=="function"?twoRoomExplainerHtml:window.twoRoomExplainerHtml)("booking-page")}
      <div id="editRoomsCards"></div>
      <button style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:8px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add booking page room</button>
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
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px;">Save Banner</button>
        </div>
      </div>
      <div class="booking-card" id="tour-booking-link-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">Your Booking Link</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${x}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${x.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
          </div>
          <button type="button" onclick="showCheckinQrOverlay()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;border-radius:12px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:12px;">
            <i data-lucide="qr-code" style="width:18px;height:18px;"></i>Show check-in QR
          </button>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Add this to your Google Business, website, or text it to guests.</p>
        </div>
      </div>
      <div class="booking-card" id="tour-rates-card" style="margin-bottom:14px;">
        <div id="tour-rates-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Rates</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div id="tour-rates-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${u.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${u.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${u.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
      <div class="booking-card" id="tour-pin-card" style="margin-bottom:14px;">
        <div id="tour-pin-header" style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Change PIN</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <input type="text" id="edit-new-pin" value="${d.isMasterPin?"":d.token}" placeholder="${d.isMasterPin?"Enter a unique hotel PIN":"Enter new PIN (min 4 chars)"}" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">${d.isMasterPin?"You are signed in with a universal admin PIN. Choose a unique owner PIN before saving.":"You'll need to use the new PIN next time you log in."}</p>
        </div>
      </div>
      ${o?.subscribed?`<div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Subscription</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <button onclick="openBillingPortal()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
        </div>
      </div>`:""}
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Need Help?</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <textarea id="supportMessage" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;"></textarea>
          </div>
          <button onclick="sendSupportMessage()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email on file.</p>
        </div>
      </div>
      </div>
      </div>
    `;e.innerHTML=E,L(),typeof lucide<"u"&&lucide.createIcons()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await d.editRoomsLoadPromise}finally{d.editRoomsLoadPromise=null}}}function te(){L()}function L(){const e=document.getElementById("editRoomsCards");if(e){if(!d.editRooms.length){e.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}e.innerHTML=d.editRooms.map((t,o)=>{const i=(t.amenities||"").split("•").map(r=>r.trim()).filter(Boolean),n=(t.images||[]).filter(r=>r&&r.url),a=jsStr(t.id);return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${t.id}" ${o===0?'data-tour-room-card="1"':""}>
      <div class="room-edit-grid">
      <div class="room-edit-media">
      <div class="room-edit-photo" data-photo-index="0">
        ${n.length?`
          <img class="room-edit-main-img" src="${esc(n[0].url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">
          ${n.length>1?`
            <button type="button" class="room-edit-image-nav room-edit-image-nav--left" aria-label="Previous photo" onclick="event.stopPropagation();stepEditRoomPhoto('${a}', -1)"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></button>
            <button type="button" class="room-edit-image-nav room-edit-image-nav--right" aria-label="Next photo" onclick="event.stopPropagation();stepEditRoomPhoto('${a}', 1)"><i data-lucide="chevron-right" style="width:20px;height:20px;"></i></button>
            <div class="room-edit-photo-count">1 / ${n.length}</div>
            <div class="room-edit-image-dots">
              ${n.map((r,s)=>`<button type="button" class="room-edit-image-dot ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="event.stopPropagation();showEditRoomPhoto('${a}', ${s})"></button>`).join("")}
            </div>`:""}
        `:'<div class="room-edit-photo-placeholder">No photos yet</div>'}
        <label class="room-edit-photo-upload">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${a}')">
        </label>
      </div>
      ${n.length>1?'<div class="room-edit-thumbs">'+n.map((r,s)=>`<div class="room-edit-thumb-wrap"><button type="button" class="room-edit-thumb ${s===0?"active":""}" aria-label="Show photo ${s+1}" ${s===0?'aria-current="true"':""} onclick="showEditRoomPhoto('${a}', ${s})"><img src="${esc(r.url)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"></button><button type="button" onclick="event.stopPropagation();deleteEditImage('${a}','${jsStr(r.id)}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
      </div>
      <div class="room-edit-fields" style="padding:18px;">
        <div style="margin-bottom:12px;">
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
            ${i.map(r=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${ue(r)} ${r} <button onclick="removeAmenity('${t.id}','${r.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
          <button onclick="saveEditRoom('${t.id}')" style="flex:1;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Changes</button>
          <button onclick="deleteEditRoom('${t.id}')" style="padding:12px 16px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;color:var(--text-muted);cursor:pointer;" onmouseover="this.style.borderColor='#E05252';this.style.color='#E05252'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">Delete</button>
        </div>
      </div>
      </div>
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function ce(e){const t=d.editRooms.find(o=>String(o.id)===String(e));return(t&&t.images||[]).filter(o=>o&&o.url)}function pe(e,t){const o=ce(e);if(!o.length)return;const i=document.getElementById("edit-card-"+e);if(!i)return;const n=o.length,a=((Number(t)||0)%n+n)%n,r=i.querySelector(".room-edit-main-img");r&&(r.src=o[a].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(a));const s=i.querySelector(".room-edit-photo-count");s&&(s.textContent=a+1+" / "+n),i.querySelectorAll(".room-edit-image-dot").forEach((u,g)=>{u.classList.toggle("active",g===a),g===a?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((u,g)=>{u.classList.toggle("active",g===a),g===a?u.setAttribute("aria-current","true"):u.removeAttribute("aria-current")})}function Oe(e,t){const i=document.getElementById("edit-card-"+e)?.querySelector(".room-edit-photo"),n=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;pe(e,n+t)}function ue(e){const t=e.toLowerCase();return t.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':t.includes("tv")||t.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':t.includes("fridge")||t.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':t.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':t.includes("housekeeping")||t.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':t.includes("bath")||t.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':t.includes("work")||t.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':t.includes("pet")||t.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':t.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':t.includes("kitchen")||t.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const ge=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let oe=null;function me(e){oe=e;const o=(d.editRooms.find(a=>a.id===e)?.amenities||"").split("•").map(a=>a.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",j),i=document.getElementById("amenityPickerModal"));const n=document.getElementById("amenityPickerGrid");n.innerHTML=ge.map(a=>{const r=o.some(s=>s.includes(a.key));return`<button onclick="toggleAmenityPreset(this,'${a.key}')" data-key="${a.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${r?"#2E7D5B":"#e5e7eb"};background:${r?"#E8F5EE":"white"};color:${r?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${a.icon}" style="width:14px;height:14px;"></i> ${a.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function De(e,t){const o=e.style.borderColor==="rgb(46, 125, 91)";e.style.borderColor=o?"#e5e7eb":"#2E7D5B",e.style.background=o?"white":"#E8F5EE",e.style.color=o?"#1a1a2e":"#2E7D5B"}function j(){document.getElementById("amenityPickerModal").style.display="none",oe=null}function Fe(){const e=d.editRooms.find(n=>n.id===oe);if(!e){j();return}const t=document.getElementById("amenityPickerGrid"),o=[];t.querySelectorAll("button").forEach(n=>{if(n.style.background==="rgb(232, 245, 238)"){const a=ge.find(r=>r.key===n.dataset.key);a&&o.push(a.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),e.amenities=o.join(" • "),j(),te(),typeof lucide<"u"&&lucide.createIcons()}function He(e){me(e)}function Ne(e,t){const o=d.editRooms.find(n=>n.id===e);if(!o)return;const i=(o.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);o.amenities=i.filter(n=>n!==t).join(" • "),te(),typeof lucide<"u"&&lucide.createIcons()}async function qe(){const e=document.getElementById("edit-hotel-name")?.value.trim(),t=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),n=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:e,subtitle:t,address:o,phone:i,cancellationPolicy:n}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function je(){const e=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),localStorage.setItem("ratesChanged","1"),d.launchStatus=null,M(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function Ue(){const e=document.getElementById("edit-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success")}catch(t){toast(t.message||"Failed to change PIN","error")}}function Ge(e){navigator.clipboard.writeText(e).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function Ve(e){const t=e.nextElementSibling,o=e.querySelector(".accordion-arrow");t.style.display==="none"?(t.style.display="block",o&&(o.style.transform="rotate(90deg)")):(t.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let D=!1;function xe(){if(document.getElementById("goLiveOverlay"))return;const e=document.createElement("div");e.id="goLiveOverlay",e.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",e.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(e)}function Q(){const e=document.getElementById("goLiveOverlay");e&&e.remove()}async function fe(){if(!D){D=!0,xe();try{const e=await api("POST","/api/crm/go-live");if(e.success&&e.url){window.location.href=e.url;return}Q(),D=!1,toast(e.message||"Failed to start checkout","error")}catch{Q(),D=!1,toast("Failed to start checkout. Try again.","error")}}}async function We(){try{const e=await api("GET","/api/crm/billing-portal");e.success&&e.url?window.location.href=e.url:toast(e.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function Ye(){const e=document.getElementById("supportMessage")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function _e(e){const t=d.editRooms.find(s=>s.id===e);if(!t){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+e)?.value.trim(),i=document.getElementById("edit-desc-"+e)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+e)?.value)||4,a=parseInt(document.getElementById("edit-units-"+e)?.value)||1,r={id:e,name:o||t.name,description:i||"",amenities:t.amenities||"",maxOccupancy:n,totalUnits:a};try{const s=await api("POST","/api/crm/rooms",r);if(s&&s.success===!1){toast(s.message||"Failed to save","error");return}t.name=r.name,t.description=r.description,t.maxOccupancy=n,t.totalUnits=a,toast("Room saved!","success")}catch(s){toast("Failed to save: "+(s.message||""),"error")}}async function Qe(e,t){const o=Array.from(e.target.files);if(!o.length)return;const n=document.getElementById("edit-card-"+t)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+t+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+t+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let a=0,r="";for(const u of o){try{const x=await X(t,u);if(x.image){const w=d.editRooms.find(E=>E.id===t);w&&(w.images||(w.images=[]),w.images.push(x.image),w.imageUrl||(w.imageUrl=x.image.url)),a++}}catch(x){r=x.message||"Upload failed"}const g=document.getElementById("upload-progress-"+t);g&&(g.textContent=a+" / "+o.length)}const s=document.getElementById("upload-spinner-"+t);s&&s.remove(),L(),a>0&&(d.launchStatus=null),M(),a>0?toast(a+" photo"+(a!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(r||"Upload failed","error")}function ye(e,t=512){return new Promise((o,i)=>{const n=new Image,a=URL.createObjectURL(e);n.onload=()=>{try{const r=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-r)/2,u=(n.naturalHeight-r)/2,g=document.createElement("canvas");g.width=t,g.height=t;const x=g.getContext("2d");x.imageSmoothingQuality="high",x.drawImage(n,s,u,r,r,0,0,t,t),URL.revokeObjectURL(a),g.toBlob(w=>w?o(w):i(new Error("crop failed")),"image/png",.92)}catch(r){URL.revokeObjectURL(a),i(r)}},n.onerror=()=>{URL.revokeObjectURL(a),i(new Error("load failed"))},n.src=a})}function he(){const e=document.getElementById("appsAppIconPreview");e&&(e.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function ie(e){const t=document.getElementById("appsAppIconPreview");t&&(t.style.background="#fff",t.style.border="1px solid var(--border)",t.style.padding="0",t.innerHTML='<img src="'+e+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function J(){const e=document.getElementById("appsAppIconPreview");if(!e)return;if(d.activeHotelAppIcon){ie(d.activeHotelAppIcon);return}const t=(d.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨";e.style.background="transparent",e.style.border="none",e.style.padding="0",e.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+t+"</span>"}async function Je(e){const t=e.files&&e.files[0];if(!t)return;he();const o=new FormData;try{const i=await ye(t,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",t)}try{const i=K(),n=new URLSearchParams;d.activeHotelId&&n.set("hotelId",d.activeHotelId),i&&n.set("token",i);const r=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(r.success&&r.appIconUrl){d.activeHotelAppIcon=r.appIconUrl,ie(r.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(d.activeHotelId||"")+"|"+r.appIconUrl+"|"+(d.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(r.message||"Failed to upload icon","error"),J()}catch{toast("Failed to upload icon","error"),J()}e.value=""}async function Ke(e,t){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${e}/images/${t}`);const o=d.editRooms.find(i=>i.id===e);o&&o.images&&(o.images=o.images.filter(i=>i.id!==t),o.imageUrl=o.images[0]?.url||null),L(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function Xe(e){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${e}`),toast("Room deleted","success"),ee()}catch{toast("Failed to delete","error")}}function Ze(){const e=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(e.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function et(){const e=document.getElementById("editNewRoomName").value.trim();e&&api("POST","/api/crm/rooms",{name:e,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),ee()}).catch(()=>toast("Failed to add","error"))}const ve={addAmenityPrompt:He,advanceTourIfNeeded:M,changePin:Ue,checklistGoTo:Be,checklistGoToRates:Ee,cleanupPostActivationTourUi:N,cleanupSettingsTourUi:U,closeAmenityPicker:j,confirmAmenityPicker:Fe,confirmEditAddRoom:et,copyBookingLink:Ge,copyBookingLinkFromChecklist:Se,deleteEditImage:Ke,deleteEditRoom:Xe,ensureTourBlurOverlay:A,finishPostActivationTour:F,getAmenityIcon:ue,getCrmAuthToken:K,getEditRoomImages:ce,goLive:fe,guestBookingEngineUrl:re,handoffToGuestAppsTour:de,hideGoLiveOverlay:Q,loadEditRooms:ee,loadSettings:ne,openAmenityPicker:me,openBillingPortal:We,openEditAddRoom:Ze,openGuestBookingEngine:Ce,openPreviewSite:Ae,openTourAccordion:I,postRoomImageUpload:X,queryTourSelector:P,removeAmenity:Ne,renderEditRooms:te,renderEditRoomsCards:L,replayWalkthrough:Le,resolveLiveTourElement:H,resolveTourHighlightEl:C,restoreAppIconPreview:J,saveEditRoom:_e,saveHotelInfo:qe,saveRates:je,scrollTourTargetIntoView:se,sendSupportMessage:Ye,setAppIconPreviewImage:ie,setAppIconPreviewLoading:he,settingsChangePin:Ie,settingsCopyLink:ke,settingsSaveRates:ze,settingsSendSupport:Pe,settingsUploadPhoto:Te,showActivatedModal:$e,showEditRoomPhoto:pe,showFinaleMockModal:R,showGoLiveOverlay:xe,showOnboardingQuestions:Me,showTestDriveModal:le,showWelcomeModal:ae,squareCropImage:ye,startPostActivationTabTour:Z,startSettingsTour:_,stepEditRoomPhoto:Oe,toggleAmenityPreset:De,toggleSection:Ve,tourAnchorRect:Y,tourElementRect:W,updatePreviewSiteBar:Re,uploadAppIcon:Je,uploadEditImages:Qe};function tt(){we(ve)}const nt=Object.freeze(Object.defineProperty({__proto__:null,default:ve,install:tt},Symbol.toStringTag,{value:"Module"}));export{ot as a,nt as b,d as c,we as e,it as s};
