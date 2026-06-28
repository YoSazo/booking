const d={token:"",isMasterPin:!1,bookings:[],guestMessages:[],currentFilter:"settings",bookingCallFilter:"all",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",blockedDemand:{total:0,today:0,recent:[]},bookingsSubview:"bookings",launchStatus:null,growthFunnel:null,growthChecklist:{},growthPeriod:"30d",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,settingsTourActive:!1,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],editRoomsLoadPromise:null,messageUnreadCount:0,messagesInboxOpen:!1,messagesThreadPickerOpen:!1,selectedMessageThread:"",bookingsVirtualList:[],bookingsVirtualRaf:0};let G=null;function mt(){return typeof lucide<"u"?Promise.resolve():G||(G=new Promise((e,t)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>e(),o.onerror=()=>t(new Error("lucide load failed")),document.head.appendChild(o)}),G)}async function Ae(e){if(!e||!e.type.startsWith("image/")||e.type==="image/webp"&&e.size<4e5)return e;try{const t=await createImageBitmap(e),o=1600,i=1200;let n=t.width,a=t.height;const r=Math.min(1,o/n,i/a);n=Math.round(n*r),a=Math.round(a*r);const s=document.createElement("canvas");s.width=n,s.height=a,s.getContext("2d").drawImage(t,0,0,n,a),t.close();const p=await new Promise((h,v)=>{s.toBlob(S=>S?h(S):v(new Error("encode failed")),"image/webp",.82)}),g=(e.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([p],g+".webp",{type:"image/webp"})}catch{return e}}function xt(){const e=()=>{d.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(e,{timeout:2500}):setTimeout(e,600)}function Ce(e){Object.assign(window,e)}async function fe(){const e=document.getElementById("settingsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const t=await api("GET","/api/crm/verify"),i="https://"+(t?.domain||d.activeHotelId+".mktel.co"),n="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(i),a=await api("GET","/api/crm/rooms");let r={nightly:69,weekly:299,monthly:999};a?.rates&&(r=a.rates);const s=a?.rooms||[];let p="";t?.subscribed||(p+=goLiveInlineCardHtml()),s.length?s.forEach(g=>{const h=g.images&&g.images.length>0;p+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;background:var(--bg);border-radius:14px 14px 0 0;overflow:hidden;">
              ${h?`<img src="${g.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:clamp(260px,34vw,380px);object-fit:contain;display:block;background:var(--bg);border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:clamp(260px,34vw,380px);background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${h?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${g.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${g.name}</div>
              ${g.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${g.description}</div>`:""}
            </div>
          </div>
        `}):p+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,p+=`
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
    `,p+=`
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
    `,p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,t?.subscribed&&(p+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),p+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `,e.innerHTML=p}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function $e(){const e=document.getElementById("settings-booking-url");e&&navigator.clipboard.writeText(e.value).then(()=>{localStorage.setItem("linkCopied","1"),N(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function Me(){localStorage.setItem("settingsTourDone","1");const e=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",e);let t=0;const o=setInterval(()=>{t++;const i=document.getElementById("edit-rate-nightly");if(i||t>20){if(clearInterval(o),!i)return;const n=i.closest(".accordion-body");if(n&&n.style.display==="none"){n.style.display="block";const a=n.previousElementSibling?.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}setTimeout(()=>{i.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const a=document.getElementById("checklistPointer");a&&a.remove();const r=i.getBoundingClientRect(),s=document.createElement("div");s.id="checklistPointer",s.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${r.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,s.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(s),setTimeout(()=>{const p=document.getElementById("checklistPointer");p&&p.remove()},6e3)},1e3)},100)}},200)}function Le(){const t="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(t).then(()=>{localStorage.setItem("linkCopied","1"),N(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function Re(e,t){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let i=0;const n=setInterval(()=>{i++;const a=document.querySelector(e);if(a||i>20){if(clearInterval(n),!a)return;a.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const r=document.getElementById("checklistPointer");r&&r.remove();const s=a.getBoundingClientRect(),p=document.createElement("div");p.id="checklistPointer",p.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${s.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,p.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${t}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(p),setTimeout(()=>{const g=document.getElementById("checklistPointer");g&&g.remove()},6e3)},1e3)}},200)}function ae(){const e=String(d.token||localStorage.getItem("crmToken")||"").trim();return e&&(d.token=e),e}async function se(e,t){const o=ae();if(!o)throw new Error("Not logged in");const i=await Ae(t),n=new FormData;n.append("image",i,i.name||"room.webp");const a=new URLSearchParams;d.activeHotelId&&a.set("hotelId",d.activeHotelId),a.set("token",o);const r=await fetch(`/api/crm/rooms/${e}/images?${a}`,{method:"POST",headers:{"x-crm-token":o},body:n}),s=await r.json().catch(()=>({}));if(!r.ok||!s.success)throw new Error(s.message||s.error||`Upload failed (${r.status})`);return s}async function He(e,t){const o=e.target.files[0];if(o)try{await se(t,o),toast("Photo uploaded!","success"),fe()}catch(i){toast(i.message||"Upload failed","error")}}async function Fe(){const e=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function De(){const e=document.getElementById("settings-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch(t){toast(t.message||"Failed to change PIN","error")}}async function Ne(){const e=document.getElementById("settings-support-msg")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function Oe(){const e=d.activeHotelDomain||d.activeHotelId+".mktel.co",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(d.activeHotelId)+"&preview=1":"https://"+e+"?preview=1";window.open(o,"_blank")}function ye(){if((window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1")&&d.activeHotelId)return"http://localhost:5173/?hotelId="+encodeURIComponent(d.activeHotelId);const t=d.activeHotelDomain||"";return t?"https://"+t+"/":""}function qe(){const e=ye();if(!e){toast("Your booking domain is still setting up.","info");return}window.open(e,"_blank")}function je(){const e=document.getElementById("previewSiteBar");e&&(e.style.display=d.currentFilter==="settings"?"block":"none")}function N(){if(localStorage.getItem("settingsTourDone"))return;const e=parseInt(localStorage.getItem("settingsTourStep")||"0"),t=d.editRooms.some(r=>r.images&&r.images.length>0),o=!!localStorage.getItem("ratesChanged"),i=!!localStorage.getItem("linkCopied");e===1&&t&&localStorage.setItem("settingsTourStep","2"),e===2&&o&&localStorage.setItem("settingsTourStep","3"),e===3&&i&&localStorage.setItem("settingsTourStep","4");const n=document.getElementById("tourTooltip");n&&n.remove();const a=document.getElementById("tourBlurOverlay");a&&a.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(r=>{r.style.position=r.dataset.tourOrigPosition||"",r.style.zIndex="",r.style.isolation="",r.style.boxShadow="",r.removeAttribute("data-tour-highlighted"),delete r.dataset.tourOrigPosition}),document.body.style.overflow=""}function Ue(){let e=0;const t={},o=[{title:"Why do you want a booking engine?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function i(){let n=document.getElementById("onboardingOverlay");if(n&&n.remove(),e>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",t).catch(()=>{})}catch{}he();return}const a=o[e],r=document.createElement("div");r.id="onboardingOverlay",r.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",a.type==="text"?(r.innerHTML=`
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
      `,document.body.appendChild(r),r.querySelectorAll(".onboarding-opt").forEach(s=>{s.addEventListener("click",()=>{t[a.key]=s.dataset.value,s.style.background="#1a1a2e",s.style.color="white",s.style.fontWeight="600",setTimeout(()=>{e++,i()},250)})}))}i()}function We(){["onboardingDone","settingsTourDone","settingsTourStep","linkCopied","ratesChanged","appsTourDone","postActivationTourDone"].forEach(t=>{localStorage.removeItem(t)});const e=new URL(window.location.href);location.href=e.pathname+"?welcome"}function he(){const e=document.createElement("div");e.id="welcomeModalOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;";function t(){localStorage.setItem("onboardingDone","1"),localStorage.removeItem("settingsTourDone"),localStorage.removeItem("settingsTourStep");try{const n=new URL(window.location);n.searchParams.delete("welcome"),window.history.replaceState({},"",n)}catch{}const i=typeof ie=="function"?ie:typeof window.startSettingsTour=="function"?window.startSettingsTour:null;i&&i(),e.remove()}function o(){e.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:12px;">🏨</div>
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
          <strong>Set up</strong> your booking page<br>
          <strong>See bookings</strong> when they come in<br>
          <strong>Track revenue</strong> your page generates<br><br>
          Your page starts in <strong style="color:#1a1a2e;">preview mode</strong> — flip the switch to start accepting reservations whenever you&apos;re ready.</p>
        <button id="welcomeModalNext" type="button" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Show me how →</button>
      </div>`,document.getElementById("welcomeModalNext").onclick=t}document.body.appendChild(e),o(),typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms()}function J(){const e=document.getElementById("postActivationTourTooltip");e&&e.remove();const t=document.getElementById("postActivationTourOverlay");t&&t.remove(),document.querySelectorAll("[data-post-activation-highlight]").forEach(o=>{o.style.boxShadow="",o.style.position="",o.style.zIndex="",o.removeAttribute("data-post-activation-highlight")}),document.body.style.overflow=""}function Y(){J(),localStorage.setItem("postActivationTourDone","1");const e=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');try{setFilter("apps",e)}catch{}}function de(){if(localStorage.getItem("postActivationTourDone")){Y();return}J();const e=[{tab:"bookings",navFilter:"bookings",text:"<strong>Bookings</strong> — live reservations land here. You'll get a push alert for each new one."},{tab:"apps",navFilter:"apps",text:"<strong>Phones</strong> — put your guest booking app on their home screen and send install reminders."}];let t=0;function o(){if(J(),t>=e.length){Y();return}const i=e[t],n=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);n&&setFilter(i.tab,n);const a=document.createElement("div");a.id="postActivationTourOverlay",a.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);",document.body.appendChild(a),document.body.style.overflow="hidden",setTimeout(()=>{const r=document.querySelector(`.tab[data-nav-filter="${i.navFilter}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${i.navFilter}"]`);r&&(r.setAttribute("data-post-activation-highlight","1"),r.style.position="relative",r.style.zIndex="100003",r.style.boxShadow="0 0 0 3px #fff, 0 0 0 6px #2E7D5B",r.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));const s=r?r.getBoundingClientRect():{left:24,bottom:80,width:200},p=document.createElement("div");p.id="postActivationTourTooltip";const g=Math.min(300,window.innerWidth-32),h=Math.max(16,Math.min(s.left+s.width/2-g/2,window.innerWidth-g-16)),v=Math.min(s.bottom+14,window.innerHeight-180);p.style.cssText=`position:fixed;z-index:100004;left:${h}px;top:${v}px;max-width:${g}px;width:${g}px;`;const S=t>=e.length-1;p.innerHTML=`
        <div style="background:#1a1a2e;border-radius:12px;padding:16px 18px;color:#fff;font-size:13px;line-height:1.55;box-shadow:0 8px 32px rgba(0,0,0,0.35);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55);">What's unlocked · ${t+1} / ${e.length}</p>
          <p style="margin:0 0 14px;">${i.text}</p>
          <button type="button" id="postActivationTourNext" style="width:100%;padding:12px;border-radius:10px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${S?"Got it — open Phones":"Next tab →"}</button>
          <button type="button" id="postActivationTourSkip" style="width:100%;margin-top:8px;padding:8px;border:none;background:transparent;color:rgba(255,255,255,0.55);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">Skip tour</button>
        </div>`,document.body.appendChild(p),document.getElementById("postActivationTourNext").onclick=()=>{t+=1,o()},document.getElementById("postActivationTourSkip").onclick=()=>{Y()}},i.tab==="apps"?80:0)}o()}window.startPostActivationTabTour=de;function Ge(){if(document.getElementById("activatedModalOverlay"))return;const e=d.activeHotelDomain||(d.activeHotelId?d.activeHotelId+".mktel.co":""),t="Bookings and Phones",o=document.createElement("div");o.id="activatedModalOverlay",o.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",o.innerHTML=`
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
  `,document.body.appendChild(o),document.getElementById("activatedModalTour").onclick=()=>{o.remove(),de()},document.getElementById("activatedModalSkip").onclick=()=>{o.remove(),localStorage.setItem("postActivationTourDone","1");try{setFilter("bookings")}catch{}}}function H(){let e=document.getElementById("tourBlurOverlay");return e||(e=document.createElement("div"),e.id="tourBlurOverlay",e.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);",document.body.appendChild(e),document.body.style.overflow="hidden",e)}function X(){const e=document.getElementById("tourTooltip");e&&e.remove();const t=document.getElementById("tourBlurOverlay");t&&t.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(i=>{i.style.position=i.dataset.tourOrigPosition||"",i.style.zIndex="",i.style.isolation="",i.style.boxShadow="",i.removeAttribute("data-tour-highlighted"),delete i.dataset.tourOrigPosition});const o=document.getElementById("goLiveBanner");o&&o.dataset.tourHidden&&(delete o.dataset.tourHidden,typeof updateGoLiveBanner=="function"&&updateGoLiveBanner()),document.body.style.overflow=""}function L(e,t){if(!t.openAccordion)return;const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(!o)return;const i=o.querySelector(".accordion-body");if(!i)return;if(i.style.display==="none"||getComputedStyle(i).display==="none"){i.style.display="block";const a=o.querySelector(".accordion-arrow");a&&(a.style.transform="rotate(90deg)")}}function C(e){if(!e)return null;for(const t of String(e).split(",").map(o=>o.trim()).filter(Boolean)){const o=document.querySelector(t);if(o&&o.isConnected)return o}return null}function F(e,t){if(t.highlightSelector){const o=C(t.highlightSelector);if(o)return o}if(t.highlightCard){const o=t.accordionCard?document.querySelector(t.accordionCard):e&&e.closest?e.closest(".booking-card"):null;if(o)return o}return t.targetParent&&(e.closest(".booking-card")||e.closest(".accordion-body"))||e}function _(e,t){if(!t)return e;const o=String(t.target||"").split(",").map(i=>i.trim()).filter(Boolean);for(const i of o){const n=document.querySelector(i);if(n&&n.isConnected)return n}if(t.accordionCard){const i=document.querySelector(t.accordionCard);if(i&&i.isConnected)return i}return e&&e.isConnected?e:null}function oe(e,t){if(!e||!e.isConnected)return null;const o=e.getBoundingClientRect();return o.width<2||o.height<2||!t&&(o.bottom<8||o.top>window.innerHeight-8)?null:o}function Q(e,t){const o=C(e.anchorSelector);if(o){const i=oe(o,!0);if(i)return i}return oe(t,!0)}function be(e,t){const o=t.scrollTarget||t.accordionCard,i=(o?C(o):null)||e;if(!i&&!t.scrollToTop)return Promise.resolve();const n=t.scrollBlock||"center",a=window.matchMedia("(prefers-reduced-motion: reduce)").matches,r=d.settingsTourActive||a?"auto":"smooth";return new Promise(s=>{const p=()=>{const $=t.scrollPadTop??80,l=t.scrollPadBottom??130,c=C(t.anchorSelector)||(i&&i.isConnected?i:null)||(e&&e.isConnected?e:null);if(!c){s();return}const y=c.getBoundingClientRect();y.top<$&&window.scrollBy({top:y.top-$,left:0,behavior:"auto"}),y.bottom>window.innerHeight-l&&window.scrollBy({top:y.bottom-window.innerHeight+l,left:0,behavior:"auto"}),requestAnimationFrame(()=>requestAnimationFrame(s))},g=()=>{i&&i.scrollIntoView({behavior:t.scrollToTop?"auto":r,block:n,inline:"nearest"}),p()};if(t.scrollToTop){if(window.scrollTo({top:0,left:0,behavior:r}),document.documentElement.scrollTop=0,document.body.scrollTop=0,t.scrollToTopOnly){requestAnimationFrame(()=>requestAnimationFrame(s));return}if(r==="auto"){g();return}let $=!1;const l=()=>{$||($=!0,window.removeEventListener("scrollend",c),clearTimeout(y),g())},c=()=>l();"onscrollend"in window&&window.addEventListener("scrollend",c,{once:!0});const y=setTimeout(l,520);return}if(!i){s();return}if(i.scrollIntoView({behavior:r,block:n,inline:"nearest"}),r==="auto"){p();return}let h=!1;const v=()=>{h||(h=!0,window.removeEventListener("scrollend",S),clearTimeout(Z),p())},S=()=>v();"onscrollend"in window&&window.addEventListener("scrollend",S,{once:!0});const Z=setTimeout(v,620)})}function Ve(){X(),localStorage.setItem("settingsTourStep","handoff");const e=()=>{const o=document.querySelector('.tab[data-nav-filter="apps"]')||document.querySelector('.mobile-nav-item[data-nav-filter="apps"]');o&&setFilter("apps",o);const i=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof i=="function"&&i(!0);const n=typeof startAppsTour=="function"?startAppsTour:window.startAppsTour;typeof n=="function"&&n({chainFromSettingsTour:!0})},t=typeof loadAppsModule=="function"?loadAppsModule:window.loadAppsModule;typeof t=="function"?t().then(e).catch(e):e()}function D(){d.settingsTourActive=!1,updateGoLiveBanner();const e=document.createElement("div");e.id="tourBlurOverlay",e.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(e),document.body.style.overflow="hidden";const t=document.createElement("div");if(t.id="tourTooltip",t.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
      <div style="padding:24px 20px;text-align:center;">
        <div style="margin-bottom:12px;display:flex;justify-content:center;"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
        <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">You're all set!</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0 0 20px;">Your booking engine is live. Here's what to do next:</p>
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
              <span style="font-size:13px;color:#166534;line-height:1.4;"><strong>Later:</strong> open <strong>Phones</strong> for your check-in QR and guest-app tools</span>
            </div>
          </div>
        </div>
        <div style="background:#fff7ed;border-radius:10px;padding:10px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
          <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">⚠️ We're not an ad agency — you won't get bookings unless you get your link in front of people.</p>
        </div>
        <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy my link & let's go!</button>
      </div>
    </div>`,document.body.appendChild(t),!document.getElementById("tourModalAnimStyle")){const o=document.createElement("style");o.id="tourModalAnimStyle",o.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(o)}typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("tourNextBtn").onclick=()=>{const i="https://"+(d.activeHotelDomain||d.activeHotelId+".mktel.co");navigator.clipboard.writeText(i).catch(()=>{}),X(),d.settingsTourActive=!1,localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),toast("Booking link copied!","success"),finishTourHydration(),ve()}}function ve(e){const t=document.createElement("div");t.id="testDriveOverlay",t.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",t.innerHTML=`
    <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
      <div style="padding:28px 22px;text-align:center;">
        <div style="margin-bottom:12px;display:flex;justify-content:center;"><i data-lucide="rocket" style="width:34px;height:34px;color:#2E7D5B;"></i></div>
        <div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">Go live and start accepting bookings</div>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 20px;">Your engine is built. Your link is copied. Activate to let guests book.</p>
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
    </div>`,document.body.appendChild(t),typeof lucide<"u"&&setTimeout(()=>lucide.createIcons(),0),document.getElementById("activateNowBtn").onclick=()=>{t.remove();const o=d.token;fetch("/api/crm/go-live",{method:"POST",headers:{"Content-Type":"application/json","x-crm-token":o},body:JSON.stringify({hotelId:d.activeHotelId})}).then(i=>i.json()).then(i=>{i.success&&i.url?window.location.href=i.url:toast("Something went wrong. Try again.","error")}).catch(()=>toast("Something went wrong. Try again.","error"))},document.getElementById("activateLaterBtn").onclick=()=>{t.remove();const o=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');o&&setFilter("bookings",o)}}function ie(){if(localStorage.getItem("settingsTourDone"))return;if(localStorage.getItem("settingsTourStep")==="handoff"){localStorage.removeItem("settingsTourStep"),D();return}d.settingsTourActive=!0,updateGoLiveBanner(),seedTourRevenueShell();const e=document.querySelector('.tab[data-nav-filter="settings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="settings"]');e&&setFilter("settings",e);function t(){if(typeof window.isEditPageDomReady=="function"&&window.isEditPageDomReady()||typeof isEditPageDomReady=="function"&&isEditPageDomReady()||!(typeof window.needsEditPageLoad=="function"&&window.needsEditPageLoad()||typeof needsEditPageLoad=="function"&&needsEditPageLoad())&&!d.editRoomsLoadPromise)return;const y=typeof window.invokeLoadEditRooms=="function"?window.invokeLoadEditRooms:typeof invokeLoadEditRooms=="function"?invokeLoadEditRooms:null;y&&y()}t();const o=[{target:"",text:"",openAccordion:!1,tab:"settings",customModal:"homescreen"},{target:"#edit-hotel-phone",text:"Tap any field here to edit your hotel info — name, address, phone.",openAccordion:!1,tab:"settings"},{target:'#editRoomsCards [data-tour-room-card="1"]',highlightSelector:'#editRoomsCards [data-tour-room-card="1"]',anchorSelector:'#editRoomsCards [data-tour-room-card="1"]',scrollTarget:'#editRoomsCards [data-tour-room-card="1"]',text:"Add a photo of your room — guests book more when they see one.",openAccordion:!1,tab:"settings",tooltipAnchor:"card-top",scrollBlock:"center",scrollPadBottom:260},{target:"#tour-rates-card",highlightSelector:"#tour-rates-card",anchorSelector:"#tour-rates-header",scrollTarget:"#tour-rates-card",text:"You can change your rates here — nightly, weekly, and monthly.",openAccordion:!0,accordionCard:"#tour-rates-card",tab:"settings",scrollBlock:"center",scrollPadBottom:280,tooltipAnchor:"card-bottom"},{target:"#tour-copy-link-btn",text:"This is your booking URL — the link guests use to book with you directly.",openAccordion:!1,tab:"settings",tooltipPosition:"below"},{target:"#tour-preview-btn",text:"Preview your booking engine to see exactly what your guests see.",openAccordion:!1,tab:"settings",tooltipPosition:"below",scrollToTop:!0,scrollToTopOnly:!0},{target:"#tour-pin-card",highlightSelector:"#tour-pin-card",anchorSelector:"#tour-pin-header",scrollTarget:"#tour-pin-card",text:"This is your login PIN — you'll need it to access this dashboard next time. You can change it here anytime.",openAccordion:!0,accordionCard:"#tour-pin-card",tab:"settings",tooltipAnchor:"card-top",scrollBlock:"center",scrollPadBottom:200},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",text:"See how much revenue your booking page generates and how much you're saving vs OTA commissions.",openAccordion:!1,tab:"revenue",waitForVisible:!0},{target:"#paymentsExplainer",text:"When guests book through your engine, their card is verified but never charged. This prevents no-shows — and you collect payment however you want when they physically check in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,tooltipPosition:"above"},{target:"#tour-fd-install-btn, #tour-fd-installed-badge",text:"Install Front Desk on this device so it opens like an app and can send booking alerts when supported.",openAccordion:!1,tab:"apps",waitForVisible:!0,tooltipPosition:"below",scrollBlock:"nearest"},{target:"#tour-guest-icon-section",highlightSelector:"#tour-guest-icon-section",anchorSelector:"#tour-guest-icon-section",scrollTarget:"#tour-guest-icon-section",text:"Set the icon guests see when they save your direct booking page. Guest QR, install link, notifications, and app tools live in this Phones tab.",openAccordion:!1,tab:"apps",waitForVisible:!0,tooltipPosition:"above",scrollBlock:"center",scrollPadBottom:260,scrollPadTop:88}];let i=parseInt(localStorage.getItem("settingsTourStep")||"0",10);(!Number.isFinite(i)||i<0||i>=o.length)&&(i=0,localStorage.removeItem("settingsTourStep"));function n(){X()}function a(){n(),localStorage.removeItem("settingsTourStep"),D()}function r(l){if(l.customModal){p(l);return}requestAnimationFrame(()=>p(l))}function s(){if(n(),i>=o.length){localStorage.removeItem("settingsTourStep"),D();return}const l=o[i];if(l.tab==="revenue"&&!d.revenueEnabled){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(l.tab==="apps"&&!(isStandaloneApp()||d.frontdeskInstalled)&&l.target&&!l.target.includes("tour-fd-install")){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}if(l.customModal||H(),l.tab&&l.tab!==d.currentFilter){const c=document.querySelector(`.tab[data-nav-filter="${l.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${l.tab}"]`);if(c&&setFilter(l.tab,c),l.tab==="apps"){const y=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof y=="function"&&y(!0)}r(l);return}r(l)}function p(l){if(l.customModal==="homescreen"){S();return}if(l.customModal===!0||l.customModal==="bookings"){$();return}if(l.customModal==="availability"){Z();return}if(l.customModal==="finale"){D();return}if(l.waitForVisible){const u=l.target.split(",").map(f=>f.trim());let m=0;const b=30;H();const w=d.settingsTourActive?60:200,x=()=>{if(m++,l.tab==="apps"){const k=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof k=="function"&&k(!0)}let f=null;for(const k of u)if(f=document.querySelector(k),f)break;if(f&&(l.openAccordion&&L(f,l),l.openAccordion||f.offsetParent!==null)){g(f,l);return}m<b?setTimeout(x,w):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};x();return}function c(u){const m=u.target.split(",").map(b=>b.trim());for(const b of m){const w=document.querySelector(b);if(w&&!(!u.openAccordion&&w.offsetParent===null&&getComputedStyle(w).position!=="fixed"))return w}if(u.accordionCard){const b=document.querySelector(u.accordionCard);if(b)return b}return null}function y(u,m){const b=c(u);if(b){m(b);return}const w=u.tab==="settings"&&!u.customModal&&u.target,x=u.tab==="apps"&&!u.customModal&&u.target;if(!w&&!x){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}H();let f=0;if(w&&t(),x){const E=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof E=="function"&&E(!0)}const k=d.settingsTourActive?60:250,T=()=>{if(f++,x){const B=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof B=="function"&&B(!0)}const E=c(u);if(E){m(E);return}if(t(),x){const B=typeof ensureAppsViewRendered=="function"?ensureAppsViewRendered:window.ensureAppsViewRendered;typeof B=="function"&&B(!0)}f<48?setTimeout(T,k):(i++,localStorage.setItem("settingsTourStep",String(i)),s())};T()}y(l,u=>g(u,l))}function g(l,c){if(L(l,c),l=F(l,c),(!l||!l.isConnected)&&(l=_(l,c),l&&(l=F(l,c))),!l){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}const y=document.getElementById("goLiveBanner");y&&c.tab==="settings"&&(y.dataset.tourHidden="1",y.style.display="none");const u=l;H(),be(u,c).then(()=>{if(!u.isConnected){i++,localStorage.setItem("settingsTourStep",String(i)),s();return}L(u,c),c.noHighlight||(u.dataset.tourOrigPosition||(u.dataset.tourOrigPosition=u.style.position||""),u.style.position=u.style.position||"relative",u.style.zIndex="99999",u.style.isolation="isolate",u.style.boxShadow="0 0 0 4px #2E7D5B, 0 0 20px rgba(46,125,91,0.3)",u.setAttribute("data-tour-highlighted","1"));const m=()=>{const x=C(c.anchorSelector)||u;if(c.freezeTooltip){const E=x&&x.isConnected?x.getBoundingClientRect():null;h(x,c,E&&E.width>=2?E:null);return}const f=_(u,c);let k=f?F(f,c):u;L(k,c);const T=c.tooltipAnchor?null:Q(c,k);h(k||u,c,T)};if(c.freezeTooltip){requestAnimationFrame(()=>requestAnimationFrame(m));return}const b=(w=0)=>{requestAnimationFrame(()=>{if(c.tooltipAnchor){m();return}const x=_(u,c);let f=x?F(x,c):u;L(f,c);const k=Q(c,f);if(!k&&w<4){requestAnimationFrame(()=>b(w+1));return}h(f||u,c,k)})};b(0)})}function h(l,c,y){const u=document.getElementById("tourTooltip");u&&u.remove();const m=document.createElement("div");m.id="tourTooltip";const b='<div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>',w=i<o.length-1?"Next →":"Got it!",x=`
      <div style="background:#1a1a2e;border-radius:10px;padding:14px 18px;color:white;font-size:13px;line-height:1.5;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);">
        <p style="margin:0 0 12px;">${c.text}</p>
        <button id="tourNextBtn" style="padding:8px 20px;border-radius:6px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${w}</button>
        ${b}
      </div>`;if(c.tooltipAnchor==="card-bottom"||c.tooltipAnchor==="card-top"){const q=C(c.highlightSelector)||l,ge=C(c.anchorSelector);if(q){const A=q.getBoundingClientRect(),j=ge?ge.getBoundingClientRect():null,z=Math.min(280,window.innerWidth-32),me=A.left+A.width/2,R=Math.max(16,Math.min(me-z/2,window.innerWidth-z-16)),U=Math.max(20,Math.min(me-R,z-20)),W=132;if(c.tooltipAnchor==="card-bottom"){const ee=window.innerHeight-A.bottom,xe=Math.min(A.bottom+12,window.innerHeight-W-16);if(ee>=W+20)m.style.cssText=`position:fixed;z-index:100000;left:${R}px;top:${xe}px;max-width:${z}px;width:${z}px;`,m.innerHTML=`
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin-left:${U-8}px;"></div>
              ${x}`;else{const te=j?j.top:A.top;m.style.cssText=`position:fixed;z-index:100000;left:${R}px;bottom:${window.innerHeight-te+10}px;max-width:${z}px;width:${z}px;`,m.innerHTML=`
              ${x}
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #1a1a2e;margin-left:${U-8}px;"></div>`}}else{const ee=A.top;if(A.top-16>=W+24)m.style.cssText=`position:fixed;z-index:100000;left:${R}px;bottom:${window.innerHeight-ee+10}px;max-width:${z}px;width:${z}px;`,m.innerHTML=`
              ${x}
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #1a1a2e;margin-left:${U-8}px;"></div>`;else{const te=Math.min(A.top+(j?j.height:48)+12,window.innerHeight-W-16);m.style.cssText=`position:fixed;z-index:100000;left:${R}px;top:${te}px;max-width:${z}px;width:${z}px;`,m.innerHTML=`
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin-left:${U-8}px;"></div>
              ${x}`}}document.body.appendChild(m),v();return}}const f=y||Q(c,l);if(!f){m.style.cssText="position:fixed;z-index:100000;left:50%;top:50%;transform:translate(-50%,-50%);max-width:280px;width:calc(100% - 32px);",m.innerHTML=x,document.body.appendChild(m),v();return}const k=window.innerHeight-f.bottom,T=f.top,E=Math.min(280,window.innerWidth-32),B=f.left+f.width/2,I=Math.max(16,Math.min(B-E/2,window.innerWidth-E-16)),M=Math.max(20,Math.min(B-I,E-20));let P=c.tooltipPosition||(k>150?"below":T>150?"above":"center");if(P==="below"&&k<130&&T>k&&(P="above"),P==="above"&&T<130&&k>T&&(P="below"),P==="below"&&f.bottom+150>window.innerHeight&&(P="above"),P==="below"){const q=Math.min(f.bottom+8,window.innerHeight-24);m.style.cssText=`position:fixed;z-index:100000;left:${I}px;top:${q}px;max-width:${E}px;width:${E}px;`,m.innerHTML=`
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin-left:${M-8}px;"></div>
        ${x}`}else P==="above"?(m.style.cssText=`position:fixed;z-index:100000;left:${I}px;bottom:${Math.max(16,window.innerHeight-f.top+8)}px;max-width:${E}px;width:${E}px;`,m.innerHTML=`
        ${x}
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #1a1a2e;margin-left:${M-8}px;"></div>`):(m.style.cssText="position:fixed;z-index:100000;left:50%;top:50%;transform:translate(-50%,-50%);max-width:280px;width:calc(100% - 32px);",m.innerHTML=x);document.body.appendChild(m),v()}function v(){const l=document.getElementById("tourNextBtn"),c=document.getElementById("tourSkipBtn");l&&(l.onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()}),c&&(c.onclick=()=>{a()})}function S(){typeof invokeLoadEditRooms=="function"&&invokeLoadEditRooms();const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";const c=d.activeHotelName||"Your Hotel",y=c.trim().charAt(0).toUpperCase(),u=c.length>10?c.slice(0,10):c,m="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",b="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",w="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",x=`<div style="${m}"><div style="${b}background:rgba(255,255,255,0.22);"></div><div style="${w}"></div></div>`,f=d.activeHotelAppIcon||"",k=f?`<img src="${f}" alt="" style="width:100%;height:100%;object-fit:contain;">`:y,T=f?`${b}background:#fff;padding:5px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`:`${b}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);`,E=`<div style="${m}"><div style="${T}">${k}</div><div style="${w}font-size:7.5px;color:#fff;font-weight:700;">${u}</div></div>`,B=[x,x,x,x,E,x,x,x].join(""),I=document.createElement("div");if(I.id="tourTooltip",I.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",I.innerHTML=`
      <div style="background:white;border-radius:22px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;overflow:hidden;">
        <div style="background:linear-gradient(160deg,#2E7D5B 0%,#1f5c43 100%);padding:22px 20px 18px;text-align:center;">
          <!-- Mini phone home-screen mockup -->
          <div style="width:172px;margin:0 auto;background:rgba(255,255,255,0.1);border-radius:24px;padding:16px 14px;border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,32px);justify-content:center;gap:13px 8px;">
              ${B}
            </div>
          </div>
        </div>
        <div style="padding:20px 22px 22px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px;line-height:1.3;">You're on their home screen</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${c}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Guests save your hotel from your booking page or a QR — set that up under <strong>Phones</strong>.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(I),!document.getElementById("tourModalAnimStyle")){const M=document.createElement("style");M.id="tourModalAnimStyle",M.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(M)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}function Z(){const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";let c=0;const y=[`<div style="padding:20px 18px 0;">
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
      </div>`],u=document.createElement("div");u.id="tourTooltip",u.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function m(){const w=c>=y.length-1?"Next — Revenue →":"Next →";u.innerHTML=`
        <div style="background:white;border-radius:20px;max-width:340px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
          ${y[c]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${y.map((x,f)=>`<div style="width:8px;height:8px;border-radius:50%;background:${f===c?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${w}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{c<y.length-1?(c++,m()):(n(),i++,localStorage.setItem("settingsTourStep",String(i)),s())},document.getElementById("tourSkipBtn").onclick=()=>{a()}}if(document.body.appendChild(u),m(),!document.getElementById("tourModalAnimStyle")){const b=document.createElement("style");b.id="tourModalAnimStyle",b.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(b)}}function $(){const l=document.createElement("div");l.id="tourBlurOverlay",l.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(l),document.body.style.overflow="hidden";const c=document.createElement("div");if(c.id="tourTooltip",c.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",c.innerHTML=`
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
      </div>`,document.body.appendChild(c),!document.getElementById("tourModalAnimStyle")){const y=document.createElement("style");y.id="tourModalAnimStyle",y.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(y)}document.getElementById("tourNextBtn").onclick=()=>{n(),i++,localStorage.setItem("settingsTourStep",String(i)),s()},document.getElementById("tourSkipBtn").onclick=()=>{a()}}s()}async function le(){if(isEditPageDomReady())return;if(d.editRoomsLoadPromise)return d.editRoomsLoadPromise;const e=document.getElementById("editRoomsList");if(e){d.editRoomsLoadPromise=(async()=>{e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const[t,o]=await Promise.all([api("GET","/api/crm/rooms"),api("GET","/api/crm/verify")]);if(!t.rooms)throw new Error("No data");d.editRooms=t.rooms;const i=o?.hotelName||"";i&&(d.activeHotelName=i),o&&(d.hotelSubscribed=!!o.subscribed,typeof updateGoLiveBanner=="function"?updateGoLiveBanner():typeof window.updateGoLiveBanner=="function"&&window.updateGoLiveBanner());const n=o?.hotelSubtitle||"",a=o?.hotelAddress||"",r=o?.hotelPhone||"",s=o?.appIconUrl||"";d.activeHotelAppIcon=s,updateFrontdeskManifestLink();let p={nightly:69,weekly:299,monthly:999,taxRate:.1};t.rates&&(p=t.rates);const h="https://"+(o?.domain||d.activeHotelId+".mktel.co"),v="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(h);let S=`
      <div class="settings-dashboard-grid">
      <div class="dash-a">
      <button id="tour-preview-btn" onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:14px;">Preview Your Site →</button>
      <div class="booking-card" style="margin-bottom:14px;">
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
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${h}</div>
            <button id="tour-copy-link-btn" onclick="copyBookingLink('${h.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
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
              <input type="number" value="${p.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${p.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${p.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
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
    `;e.innerHTML=S,O(),typeof lucide<"u"&&lucide.createIcons()}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load your page</div><div class="empty-sub">Check your connection and refresh.</div></div>'}})();try{await d.editRoomsLoadPromise}finally{d.editRoomsLoadPromise=null}}}function ce(){O()}function O(){const e=document.getElementById("editRoomsCards");if(e){if(!d.editRooms.length){e.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}e.innerHTML=d.editRooms.map((t,o)=>{const i=(t.amenities||"").split("•").map(r=>r.trim()).filter(Boolean),n=(t.images||[]).filter(r=>r&&r.url),a=jsStr(t.id);return`
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
            ${i.map(r=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${Ee(r)} ${r} <button onclick="removeAmenity('${t.id}','${r.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join(""),typeof lucide<"u"&&lucide.createIcons()}}function we(e){const t=d.editRooms.find(o=>String(o.id)===String(e));return(t&&t.images||[]).filter(o=>o&&o.url)}function ke(e,t){const o=we(e);if(!o.length)return;const i=document.getElementById("edit-card-"+e);if(!i)return;const n=o.length,a=((Number(t)||0)%n+n)%n,r=i.querySelector(".room-edit-main-img");r&&(r.src=o[a].url),i.querySelector(".room-edit-photo")?.setAttribute("data-photo-index",String(a));const s=i.querySelector(".room-edit-photo-count");s&&(s.textContent=a+1+" / "+n),i.querySelectorAll(".room-edit-image-dot").forEach((p,g)=>{p.classList.toggle("active",g===a),g===a?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")}),i.querySelectorAll(".room-edit-thumb").forEach((p,g)=>{p.classList.toggle("active",g===a),g===a?p.setAttribute("aria-current","true"):p.removeAttribute("aria-current")})}function Ye(e,t){const i=document.getElementById("edit-card-"+e)?.querySelector(".room-edit-photo"),n=parseInt(i?.getAttribute("data-photo-index")||"0",10)||0;ke(e,n+t)}function Ee(e){const t=e.toLowerCase();return t.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':t.includes("tv")||t.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':t.includes("fridge")||t.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':t.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':t.includes("housekeeping")||t.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':t.includes("bath")||t.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':t.includes("work")||t.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':t.includes("pet")||t.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':t.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':t.includes("kitchen")||t.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const Se=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let pe=null;function Te(e){pe=e;const o=(d.editRooms.find(a=>a.id===e)?.amenities||"").split("•").map(a=>a.trim().toLowerCase()).filter(Boolean);let i=document.getElementById("amenityPickerModal");i||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",K),i=document.getElementById("amenityPickerModal"));const n=document.getElementById("amenityPickerGrid");n.innerHTML=Se.map(a=>{const r=o.some(s=>s.includes(a.key));return`<button onclick="toggleAmenityPreset(this,'${a.key}')" data-key="${a.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${r?"#2E7D5B":"#e5e7eb"};background:${r?"#E8F5EE":"white"};color:${r?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${a.icon}" style="width:14px;height:14px;"></i> ${a.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",i.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function _e(e,t){const o=e.style.borderColor==="rgb(46, 125, 91)";e.style.borderColor=o?"#e5e7eb":"#2E7D5B",e.style.background=o?"white":"#E8F5EE",e.style.color=o?"#1a1a2e":"#2E7D5B"}function K(){document.getElementById("amenityPickerModal").style.display="none",pe=null}function Qe(){const e=d.editRooms.find(n=>n.id===pe);if(!e){K();return}const t=document.getElementById("amenityPickerGrid"),o=[];t.querySelectorAll("button").forEach(n=>{if(n.style.background==="rgb(232, 245, 238)"){const a=Se.find(r=>r.key===n.dataset.key);a&&o.push(a.label)}});const i=document.getElementById("amenityCustomInput").value.trim();i&&o.push(i),e.amenities=o.join(" • "),K(),ce(),typeof lucide<"u"&&lucide.createIcons()}function Je(e){Te(e)}function Ke(e,t){const o=d.editRooms.find(n=>n.id===e);if(!o)return;const i=(o.amenities||"").split("•").map(n=>n.trim()).filter(Boolean);o.amenities=i.filter(n=>n!==t).join(" • "),ce(),typeof lucide<"u"&&lucide.createIcons()}async function Xe(){const e=document.getElementById("edit-hotel-name")?.value.trim(),t=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),i=document.getElementById("edit-hotel-phone")?.value.trim(),n=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:e,subtitle:t,address:o,phone:i,cancellationPolicy:n}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function Ze(){const e=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),localStorage.setItem("ratesChanged","1"),d.launchStatus=null,N(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function et(){const e=document.getElementById("edit-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{const t=await api("POST","/api/crm/change-pin",{newPin:e});if(!t.success)throw new Error(t.message||"Failed to change PIN");d.token=e,d.isMasterPin=!1;try{localStorage.setItem("crmToken",d.token)}catch{}toast("PIN updated!","success")}catch(t){toast(t.message||"Failed to change PIN","error")}}function tt(e){navigator.clipboard.writeText(e).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function ot(e){const t=e.nextElementSibling,o=e.querySelector(".accordion-arrow");t.style.display==="none"?(t.style.display="block",o&&(o.style.transform="rotate(90deg)")):(t.style.display="none",o&&(o.style.transform="rotate(0deg)"))}let V=!1;function ze(){if(document.getElementById("goLiveOverlay"))return;const e=document.createElement("div");e.id="goLiveOverlay",e.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;",e.innerHTML='<div class="logo-sprite-bounce"></div><div style="font-size:14px;font-weight:700;color:#1a5c3f;">Opening secure checkout…</div><div style="font-size:12px;color:#6b7280;">Taking you to Stripe — one moment</div>',document.body.appendChild(e)}function ne(){const e=document.getElementById("goLiveOverlay");e&&e.remove()}async function it(){if(!V){V=!0,ze();try{const e=await api("POST","/api/crm/go-live");if(e.success&&e.url){window.location.href=e.url;return}ne(),V=!1,toast(e.message||"Failed to start checkout","error")}catch{ne(),V=!1,toast("Failed to start checkout. Try again.","error")}}}async function nt(){try{const e=await api("GET","/api/crm/billing-portal");e.success&&e.url?window.location.href=e.url:toast(e.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function rt(){const e=document.getElementById("supportMessage")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function at(e){const t=d.editRooms.find(s=>s.id===e);if(!t){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+e)?.value.trim(),i=document.getElementById("edit-desc-"+e)?.value.trim(),n=parseInt(document.getElementById("edit-occ-"+e)?.value)||4,a=parseInt(document.getElementById("edit-units-"+e)?.value)||1,r={id:e,name:o||t.name,description:i||"",amenities:t.amenities||"",maxOccupancy:n,totalUnits:a};try{const s=await api("POST","/api/crm/rooms",r);if(s&&s.success===!1){toast(s.message||"Failed to save","error");return}t.name=r.name,t.description=r.description,t.maxOccupancy=n,t.totalUnits=a,toast("Room saved!","success")}catch(s){toast("Failed to save: "+(s.message||""),"error")}}async function st(e,t){const o=Array.from(e.target.files);if(!o.length)return;const n=document.getElementById("edit-card-"+t)?.querySelector("div:first-child");n&&(n.style.position="relative",n.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+t+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+t+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let a=0,r="";for(const p of o){try{const h=await se(t,p);if(h.image){const v=d.editRooms.find(S=>S.id===t);v&&(v.images||(v.images=[]),v.images.push(h.image),v.imageUrl||(v.imageUrl=h.image.url)),a++}}catch(h){r=h.message||"Upload failed"}const g=document.getElementById("upload-progress-"+t);g&&(g.textContent=a+" / "+o.length)}const s=document.getElementById("upload-spinner-"+t);s&&s.remove(),O(),a>0&&(d.launchStatus=null),N(),a>0?toast(a+" photo"+(a!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success"):toast(r||"Upload failed","error")}function Be(e,t=512){return new Promise((o,i)=>{const n=new Image,a=URL.createObjectURL(e);n.onload=()=>{try{const r=Math.min(n.naturalWidth,n.naturalHeight),s=(n.naturalWidth-r)/2,p=(n.naturalHeight-r)/2,g=document.createElement("canvas");g.width=t,g.height=t;const h=g.getContext("2d");h.imageSmoothingQuality="high",h.drawImage(n,s,p,r,r,0,0,t,t),URL.revokeObjectURL(a),g.toBlob(v=>v?o(v):i(new Error("crop failed")),"image/png",.92)}catch(r){URL.revokeObjectURL(a),i(r)}},n.onerror=()=>{URL.revokeObjectURL(a),i(new Error("load failed"))},n.src=a})}function Ie(){const e=document.getElementById("appsAppIconPreview");e&&(e.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function ue(e){const t=document.getElementById("appsAppIconPreview");t&&(t.style.background="#fff",t.style.border="1px solid var(--border)",t.style.padding="0",t.innerHTML='<img src="'+e+'" alt="App icon" style="width:100%;height:100%;object-fit:contain;">')}function re(){const e=document.getElementById("appsAppIconPreview");if(!e)return;if(d.activeHotelAppIcon){ue(d.activeHotelAppIcon);return}const t=(d.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨";e.style.background="transparent",e.style.border="none",e.style.padding="0",e.innerHTML='<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--green);color:#fff;border-radius:14px;font-size:24px;font-weight:800;">'+t+"</span>"}async function dt(e){const t=e.files&&e.files[0];if(!t)return;Ie();const o=new FormData;try{const i=await Be(t,512);o.append("icon",i,"app-icon.png")}catch{o.append("icon",t)}try{const i=ae(),n=new URLSearchParams;d.activeHotelId&&n.set("hotelId",d.activeHotelId),i&&n.set("token",i);const r=await(await fetch(`/api/crm/hotel-app-icon?${n}`,{method:"POST",headers:{"x-crm-token":i},body:o})).json();if(r.success&&r.appIconUrl){d.activeHotelAppIcon=r.appIconUrl,ue(r.appIconUrl);const s=document.getElementById("appsView");s&&(s.dataset.appsKey=(d.activeHotelId||"")+"|"+r.appIconUrl+"|"+(d.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else toast(r.message||"Failed to upload icon","error"),re()}catch{toast("Failed to upload icon","error"),re()}e.value=""}async function lt(e,t){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${e}/images/${t}`);const o=d.editRooms.find(i=>i.id===e);o&&o.images&&(o.images=o.images.filter(i=>i.id!==t),o.imageUrl=o.images[0]?.url||null),O(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function ct(e){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${e}`),toast("Room deleted","success"),le()}catch{toast("Failed to delete","error")}}function pt(){const e=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(e.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function ut(){const e=document.getElementById("editNewRoomName").value.trim();e&&api("POST","/api/crm/rooms",{name:e,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),le()}).catch(()=>toast("Failed to add","error"))}const Pe={addAmenityPrompt:Je,advanceTourIfNeeded:N,changePin:et,checklistGoTo:Re,checklistGoToRates:Me,cleanupPostActivationTourUi:J,cleanupSettingsTourUi:X,closeAmenityPicker:K,confirmAmenityPicker:Qe,confirmEditAddRoom:ut,copyBookingLink:tt,copyBookingLinkFromChecklist:Le,deleteEditImage:lt,deleteEditRoom:ct,ensureTourBlurOverlay:H,finishPostActivationTour:Y,getAmenityIcon:Ee,getCrmAuthToken:ae,getEditRoomImages:we,goLive:it,guestBookingEngineUrl:ye,handoffToGuestAppsTour:Ve,hideGoLiveOverlay:ne,loadEditRooms:le,loadSettings:fe,openAmenityPicker:Te,openBillingPortal:nt,openEditAddRoom:pt,openGuestBookingEngine:qe,openPreviewSite:Oe,openTourAccordion:L,postRoomImageUpload:se,queryTourSelector:C,removeAmenity:Ke,renderEditRooms:ce,renderEditRoomsCards:O,replayWalkthrough:We,resolveLiveTourElement:_,resolveTourHighlightEl:F,restoreAppIconPreview:re,saveEditRoom:at,saveHotelInfo:Xe,saveRates:Ze,scrollTourTargetIntoView:be,sendSupportMessage:rt,setAppIconPreviewImage:ue,setAppIconPreviewLoading:Ie,settingsChangePin:De,settingsCopyLink:$e,settingsSaveRates:Fe,settingsSendSupport:Ne,settingsUploadPhoto:He,showActivatedModal:Ge,showEditRoomPhoto:ke,showFinaleMockModal:D,showGoLiveOverlay:ze,showOnboardingQuestions:Ue,showTestDriveModal:ve,showWelcomeModal:he,squareCropImage:Be,startPostActivationTabTour:de,startSettingsTour:ie,stepEditRoomPhoto:Ye,toggleAmenityPreset:_e,toggleSection:ot,tourAnchorRect:Q,tourElementRect:oe,updatePreviewSiteBar:je,uploadAppIcon:dt,uploadEditImages:st};function gt(){Ce(Pe)}const ft=Object.freeze(Object.defineProperty({__proto__:null,default:Pe,install:gt},Symbol.toStringTag,{value:"Module"}));export{mt as a,ft as b,d as c,Ce as e,xt as s};
