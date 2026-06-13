const p={token:"",bookings:[],guestMessages:[],currentFilter:"settings",manualAvailability:{rooms:[],overrides:{}},manualSelectedRoom:"",availabilityYear:new Date().getFullYear(),availabilityMonth:new Date().getMonth(),availabilityEditingDay:"",availabilityDaySaving:!1,editingRoomName:"",pendingDeleteRoomName:"",currentHotelPms:"",revenueEnabled:!1,hotelSubscribed:!1,revenuePeriod:"30d",revenueCache:{},revenueLoading:!1,revenueError:"",ALLOWED_REVENUE_PERIODS:new Set(["today","7d","30d","all"]),OTA_COMMISSION_RATE:.25,activeHotelId:"",activeHotelName:"",activeHotelAppIcon:"",appsViewPlatform:"ios",activeHotelDomain:"",activeHotelContext:null,bootInFlight:!1,CRM_HOTEL_BY_HOST:{"guestlodgeminot.clickinns.com":"guest-lodge-minot","booking-kappa-nine.vercel.app":"guest-lodge-minot","stcroix.clickinns.com":"st-croix-wisconsin","homeplacesuites.clickinns.com":"home-place-suites","myhomeplacesuites.com":"home-place-suites","www.myhomeplacesuites.com":"home-place-suites","suitestay.clickinns.com":"suite-stay","clickinns.com":"suite-stay","www.clickinns.com":"suite-stay"},CRM_HOTEL_LABELS:{"guest-lodge-minot":"Guest Lodge Minot","st-croix-wisconsin":"St. Croix Wisconsin","home-place-suites":"Home Place Suites","suite-stay":"Suite Stay"},deferredInstallPrompt:null,frontdeskInstalled:!1,_magicLoginPending:!1,editRooms:[],messageUnreadCount:0,bookingsVirtualList:[],bookingsVirtualRaf:0};let T=null;function Ce(){return typeof lucide<"u"?Promise.resolve():T||(T=new Promise((e,t)=>{const o=document.createElement("script");o.src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js",o.async=!0,o.onload=()=>e(),o.onerror=()=>t(new Error("lucide load failed")),document.head.appendChild(o)}),T)}async function L(e){if(!e||!e.type.startsWith("image/")||e.type==="image/webp"&&e.size<4e5)return e;try{const t=await createImageBitmap(e),o=1600,r=1200;let i=t.width,n=t.height;const d=Math.min(1,o/i,r/n);i=Math.round(i*d),n=Math.round(n*d);const l=document.createElement("canvas");l.width=i,l.height=n,l.getContext("2d").drawImage(t,0,0,i,n),t.close();const x=await new Promise((m,w)=>{l.toBlob(h=>h?m(h):w(new Error("encode failed")),"image/webp",.82)}),u=(e.name||"room-photo").replace(/\.[^.]+$/,"")||"room-photo";return new File([x],u+".webp",{type:"image/webp"})}catch{return e}}function Me(){const e=()=>{p.currentFilter==="bookings"?loadMessages():loadMessageBadges()};"requestIdleCallback"in window?requestIdleCallback(e,{timeout:2500}):setTimeout(e,600)}function V(e){Object.assign(window,e)}async function N(){const e=document.getElementById("settingsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const t=await api("GET","/api/crm/verify"),r="https://"+(t?.domain||p.activeHotelId+".bookmarketel.com"),i="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(r),n=await api("GET","/api/crm/rooms");let d={nightly:69,weekly:299,monthly:999};n?.rates&&(d=n.rates);const l=n?.rooms||[];let x="";l.length?l.forEach(u=>{const m=u.images&&u.images.length>0;x+=`
          <div class="booking-card" style="margin-bottom:14px;">
            <div style="position:relative;">
              ${m?`<img src="${u.images[0].url}" loading="lazy" decoding="async" style="width:100%;height:200px;object-fit:cover;display:block;border-radius:14px 14px 0 0;">`:'<div style="width:100%;height:140px;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;border-radius:14px 14px 0 0;">No photos yet</div>'}
              <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                📷 ${m?"Change Photo":"+ Add Photo"}
                <input type="file" accept="image/*" style="display:none;" onchange="settingsUploadPhoto(event,'${u.id}')">
              </label>
            </div>
            <div style="padding:14px 18px;">
              <div style="font-size:16px;font-weight:700;color:var(--text);">${u.name}</div>
              ${u.description?`<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${u.description}</div>`:""}
            </div>
          </div>
        `}):x+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">No rooms yet</div>
            <p style="font-size:13px;color:var(--text-muted);">Add a room type to get started.</p>
          </div>
        </div>
      `,x+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Your Booking Link</div>
          <div style="margin-bottom:12px;">
            <input type="text" value="${r}" readonly style="width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:'DM Mono',monospace;font-size:10px;color:var(--text);background:var(--bg);box-sizing:border-box;" id="settings-booking-url">
          </div>
          <button onclick="settingsCopyLink()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Copy Link</button>
          <button onclick="window.open('${r}?preview=1', '_blank')" style="width:100%;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;">Preview Your Site →</button>
          <div style="text-align:center;margin-top:20px;"><img src="${i}" style="width:140px;height:140px;border-radius:10px;border:1.5px solid var(--border);" alt="QR Code"></div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px;">Share this link or QR code with guests</p>
        </div>
      </div>
    `,x+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Rates</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${d.nightly}" id="settings-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${d.weekly}" id="settings-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${d.monthly}" id="settings-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="settingsSaveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
    `,x+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Change PIN</div>
          <input type="text" id="settings-new-pin" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;margin-bottom:10px;">
          <button onclick="settingsChangePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
        </div>
      </div>
    `,t?.subscribed&&(x+=`
        <div class="booking-card" style="margin-bottom:14px;">
          <div style="padding:18px;">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Subscription</div>
            <button onclick="openBillingPortal()" style="width:100%;padding:12px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Manage Subscription</button>
            <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">View invoices, update payment method, or cancel.</p>
          </div>
        </div>
      `),x+=`
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Need Help?</div>
          <textarea id="settings-support-msg" placeholder="Describe your issue or question..." style="width:100%;min-height:80px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--border);font-family:inherit;font-size:14px;outline:none;resize:vertical;margin-bottom:10px;"></textarea>
          <button onclick="settingsSendSupport()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Send Message</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">We'll reply to your email within 24 hours.</p>
        </div>
      </div>
    `,e.innerHTML=x}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to load settings</div></div>'}}}function Q(){const e=document.getElementById("settings-booking-url");e&&navigator.clipboard.writeText(e.value).then(()=>{localStorage.setItem("linkCopied","1"),I(),toast("Link copied!","success")}).catch(()=>toast("Copy failed","error"))}function J(){localStorage.setItem("settingsTourDone","1");const e=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",e);let t=0;const o=setInterval(()=>{t++;const r=document.getElementById("edit-rate-nightly");if(r||t>20){if(clearInterval(o),!r)return;const i=r.closest(".accordion-body");if(i&&i.style.display==="none"){i.style.display="block";const n=i.previousElementSibling?.querySelector(".accordion-arrow");n&&(n.style.transform="rotate(90deg)")}setTimeout(()=>{r.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const n=document.getElementById("checklistPointer");n&&n.remove();const d=r.getBoundingClientRect(),l=document.createElement("div");l.id="checklistPointer",l.style.cssText=`position:fixed;z-index:100000;left:50%;transform:translateX(-50%);top:${d.bottom+12}px;max-width:240px;width:calc(100% - 40px);`,l.innerHTML=`
            <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
            <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span>Set your nightly rate here</span>
              <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
            </div>
          `,document.body.appendChild(l),setTimeout(()=>{const x=document.getElementById("checklistPointer");x&&x.remove()},6e3)},1e3)},100)}},200)}function K(){const t="https://"+(p.activeHotelDomain||p.activeHotelId+".bookmarketel.com");navigator.clipboard.writeText(t).then(()=>{localStorage.setItem("linkCopied","1"),I(),toast("Link copied!","success"),loadBookings()}).catch(()=>toast("Copy failed","error"))}function X(e,t){localStorage.setItem("settingsTourDone","1");const o=document.querySelector('[data-nav-filter="settings"]');setFilter("settings",o);let r=0;const i=setInterval(()=>{r++;const n=document.querySelector(e);if(n||r>20){if(clearInterval(i),!n)return;n.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const d=document.getElementById("checklistPointer");d&&d.remove();const l=n.getBoundingClientRect(),x=document.createElement("div");x.id="checklistPointer",x.style.cssText=`
          position:fixed;z-index:100000;left:50%;transform:translateX(-50%);
          top:${l.bottom+12}px;max-width:240px;width:calc(100% - 40px);
        `,x.innerHTML=`
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin:0 auto;"></div>
          <div style="background:#1a1a2e;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span>${t}</span>
            <button onclick="document.getElementById('checklistPointer').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
          </div>
        `,document.body.appendChild(x),setTimeout(()=>{const u=document.getElementById("checklistPointer");u&&u.remove()},6e3)},1e3)}},200)}async function Z(e,t){const o=e.target.files[0];if(!o)return;const r=await L(o),i=new FormData;i.append("image",r,r.name||"room.webp");try{const d=await(await fetch(`/api/crm/rooms/${t}/images?hotelId=${encodeURIComponent(i.activeHotelId)}`,{method:"POST",headers:{"x-crm-token":i.token},body:i})).json();d.success?(toast("Photo uploaded!","success"),N()):toast(d.message||"Upload failed","error")}catch{toast("Upload failed","error")}}async function ee(){const e=parseFloat(document.getElementById("settings-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("settings-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("settings-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),toast("Rates saved","success")}catch{toast("Failed to save rates","error")}}async function te(){const e=document.getElementById("settings-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{await api("POST","/api/crm/change-pin",{newPin:e}),p.token=e;try{localStorage.setItem("crmToken",p.token)}catch{}toast("PIN updated!","success"),document.getElementById("settings-new-pin").value=""}catch{toast("Failed to change PIN","error")}}async function oe(){const e=document.getElementById("settings-support-msg")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),toast("Message sent!","success"),document.getElementById("settings-support-msg").value=""}catch{toast("Failed to send","error")}}function ie(){const e=p.activeHotelDomain||p.activeHotelId+".bookmarketel.com",o=window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"?"http://localhost:5173/?hotelId="+encodeURIComponent(p.activeHotelId)+"&preview=1":"https://"+e+"?preview=1";window.open(o,"_blank")}function ne(){const e=document.getElementById("previewSiteBar");e&&(e.style.display=p.currentFilter==="settings"?"block":"none")}function I(){if(localStorage.getItem("settingsTourDone"))return;const e=parseInt(localStorage.getItem("settingsTourStep")||"0"),t=p.editRooms.some(d=>d.images&&d.images.length>0),o=!!localStorage.getItem("ratesChanged"),r=!!localStorage.getItem("linkCopied");e===1&&t&&localStorage.setItem("settingsTourStep","2"),e===2&&o&&localStorage.setItem("settingsTourStep","3"),e===3&&r&&localStorage.setItem("settingsTourStep","4");const i=document.getElementById("tourTooltip");i&&i.remove();const n=document.getElementById("tourBlurOverlay");n&&n.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(d=>{d.style.position=d.dataset.tourOrigPosition||"",d.style.zIndex="",d.style.boxShadow="",d.removeAttribute("data-tour-highlighted"),delete d.dataset.tourOrigPosition}),document.body.style.overflow=""}function re(){let e=0;const t={},o=[{title:"Why do you want a booking engine?",key:"why",type:"text",placeholder:"e.g. I want guests to book directly instead of calling me..."},{title:"How do guests currently book with you?",key:"currentBooking",type:"choice",options:[{label:"They call me or walk in",value:"phone_walkin"},{label:"Through Booking.com / Expedia",value:"ota"},{label:"I have a website but no booking system",value:"website_no_booking"},{label:"I don't take bookings online yet",value:"no_online"}]},{title:"How many rooms do you have?",key:"roomCount",type:"choice",options:[{label:"1–5 rooms",value:"1-5"},{label:"6–15 rooms",value:"6-15"},{label:"16–50 rooms",value:"16-50"},{label:"50+ rooms",value:"50+"}]},{title:"What's most important to you?",key:"priority",type:"choice",options:[{label:"Stop paying OTA commissions",value:"no_commission"},{label:"Get more direct bookings",value:"more_bookings"},{label:"Have a professional online presence",value:"professional"},{label:"Make it easier for guests to book",value:"easier_booking"}]}];function r(){let i=document.getElementById("onboardingOverlay");if(i&&i.remove(),e>=o.length){localStorage.setItem("onboardingDone","1");try{api("POST","/api/crm/onboarding-answers",t).catch(()=>{})}catch{}H();return}const n=o[e],d=document.createElement("div");d.id="onboardingOverlay",d.style.cssText="position:fixed;inset:0;z-index:100001;background:linear-gradient(135deg, #1a2b22 0%, #2E7D5B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;",n.type==="text"?(d.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <textarea id="onboardingTextInput" placeholder="${n.placeholder||""}" style="width:100%;min-height:100px;padding:14px;border-radius:12px;border:none;font-family:inherit;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;background:rgba(255,255,255,0.95);"></textarea>
          <button id="onboardingTextSubmit" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:white;color:#2E7D5B;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Next →</button>
        </div>
      `,document.body.appendChild(d),document.getElementById("onboardingTextSubmit").onclick=()=>{const l=document.getElementById("onboardingTextInput").value.trim();l&&(t[n.key]=l,e++,r())}):(d.innerHTML=`
        <div style="max-width:360px;width:100%;text-align:center;">
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Question ${e+1} of ${o.length}</div>
          <h2 style="font-size:20px;font-weight:700;color:white;margin:0 0 24px;line-height:1.3;">${n.title}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${n.options.map(l=>`
              <button class="onboarding-opt" data-value="${l.value}" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:rgba(255,255,255,0.95);font-family:inherit;font-size:14px;font-weight:500;color:#1a1a2e;cursor:pointer;text-align:left;transition:all 0.15s;">
                ${l.label}
              </button>
            `).join("")}
          </div>
        </div>
      `,document.body.appendChild(d),d.querySelectorAll(".onboarding-opt").forEach(l=>{l.addEventListener("click",()=>{t[n.key]=l.dataset.value,l.style.background="#1a1a2e",l.style.color="white",l.style.fontWeight="600",setTimeout(()=>{e++,r()},250)})}))}r()}function H(){const e=document.createElement("div");e.id="welcomeModalOverlay",e.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",e.innerHTML=`
    <div style="background:white;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
      <div style="font-size:32px;margin-bottom:12px;">🏨</div>
      <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">Welcome to your Front Desk</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0 0 20px;text-align:left;">This is where you:<br><br>
        <strong>Set up</strong> your booking page<br>
        <strong>See bookings</strong> when they come in<br>
        <strong>Track revenue</strong> your page generates</p>
      <button id="welcomeModalGotIt" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Got it — show me around</button>
    </div>
  `,document.body.appendChild(e),document.getElementById("welcomeModalGotIt").onclick=()=>{e.remove(),setTimeout(()=>{M()},200)}}function ae(){if(document.getElementById("activatedModalOverlay"))return;const e=p.activeHotelDomain||(p.activeHotelId?p.activeHotelId+".bookmarketel.com":""),t=document.createElement("div");t.id="activatedModalOverlay",t.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",t.innerHTML=`
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
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>New bookings appear right here</strong> in your Bookings tab, and you'll get a notification for each one.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>You're billed monthly.</strong> Cancel anytime from <strong>Settings → Manage Subscription</strong> — no contracts.</span>
        </div>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <span style="color:#2E7D5B;font-weight:700;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#1a1a2e;line-height:1.5;"><strong>A receipt is on its way</strong> to your email from Stripe.</span>
        </div>
      </div>
      ${e?`<p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Your booking page: <strong style="color:#2E7D5B;">${e}</strong></p>`:""}
      <button id="activatedModalDone" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Got it — take me to my bookings</button>
    </div>
  `,document.body.appendChild(t),document.getElementById("activatedModalDone").onclick=()=>{t.remove();try{setFilter("bookings")}catch{}}}function R(){const e=isStandaloneApp()||p.frontdeskInstalled,t=typeof Notification<"u"&&Notification.permission==="granted";let o;return e&&pushSupported()?o=t?`<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">You're all set — you'll get an alert on this phone every time a guest books.</p>
         <button onclick="toggleAppNotifications()" style="padding:10px 16px;border-radius:10px;border:1.5px solid var(--green);background:none;color:var(--green);font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Send a test notification</button>`:`<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">You're in the app. Turn on alerts to get a notification the moment a guest books — even when it's closed.</p>
         <button onclick="toggleAppNotifications()" style="padding:10px 16px;border-radius:10px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Turn on notifications</button>`:e&&!pushSupported()?o=`<p style="font-size:12px;color:var(--text-muted);margin:0;line-height:1.5;">Front Desk is installed for quick one-tap access. (This device can't show push notifications.)</p>`:o=`<p style="font-size:12px;color:var(--text-muted);margin:0 0 14px;line-height:1.5;">Add <strong>Front Desk</strong> to your home screen to get a buzz the second a guest books — even when it's closed. Takes 3 seconds.</p>
       <button onclick="handleInstallFrontdesk()" style="padding:10px 16px;border-radius:10px;border:none;background:var(--green);color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Add Front Desk to home screen</button>`,`<div class="booking-card" id="frontdeskInstallCard" style="margin-bottom:14px;"><div style="padding:18px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">🔔 Get booking alerts on your phone</div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:68px;height:68px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.12);background:#fff;padding:10px;box-sizing:border-box;">
          <img src="/marketellogo.svg" alt="Front Desk app" style="width:100%;height:100%;object-fit:contain;">
        </div>
        <div style="flex:1;min-width:0;">
          ${o}
        </div>
      </div>
    </div></div>`}function C(){const e=document.getElementById("frontdeskInstallCard");e&&(e.outerHTML=R())}function de(){if(isIosDevice()){O({title:(p.activeHotelName?p.activeHotelName+" ":"")+"Front Desk",subtitle:"Add it to your home screen — takes 3 seconds."});return}p.deferredInstallPrompt?(p.deferredInstallPrompt.prompt(),p.deferredInstallPrompt.userChoice.then(e=>{e&&e.outcome==="accepted"&&(p.frontdeskInstalled=!0),p.deferredInstallPrompt=null,C()}).catch(()=>{})):toast('Use your browser menu → "Install app" / "Add to Home screen".',"info")}async function se(){if(typeof Notification<"u"&&Notification.permission==="granted"){try{await api("POST","/api/push/test",{}),toast("Test notification sent","success")}catch{toast("Could not send test","error")}return}await enableNotifications(),C()}function le(){try{if(!isStandaloneApp()||!pushSupported()||typeof Notification>"u"||Notification.permission!=="default"||localStorage.getItem("notifPromptShown")==="1"||document.getElementById("welcomeModalOverlay")||document.getElementById("activatedModalOverlay"))return;localStorage.setItem("notifPromptShown","1"),setTimeout(F,700)}catch{}}function F(){if(document.getElementById("notifPromptOverlay"))return;const e=document.createElement("div");e.id="notifPromptOverlay",e.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;",e.innerHTML=`
    <div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
      <div style="font-size:34px;margin-bottom:10px;">🔔</div>
      <h2 style="font-size:19px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">Turn on booking alerts?</h2>
      <p style="font-size:13px;color:#6b7280;line-height:1.55;margin:0 0 20px;">Get a notification the moment a guest books — even when the app is closed.</p>
      <button id="notifPromptEnable" style="width:100%;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">Enable notifications</button>
      <button id="notifPromptLater" style="width:100%;padding:12px;border-radius:12px;border:none;background:none;color:#6b7280;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Not now</button>
    </div>`,document.body.appendChild(e),document.getElementById("notifPromptEnable").onclick=async()=>{e.remove(),await enableNotifications(),C()},document.getElementById("notifPromptLater").onclick=()=>e.remove()}function O({title:e,subtitle:t,iconUrl:o,openUrl:r}={}){const i=document.getElementById("iosInstallSheet");i&&i.remove();const n=document.createElement("div");n.id="iosInstallSheet",n.style.cssText="position:fixed;inset:0;z-index:100003;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;align-items:flex-end;justify-content:center;";const d=o?`<img src="${o}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;flex-shrink:0;">`:`<div style="width:48px;height:48px;border-radius:12px;flex-shrink:0;background:#2E7D5B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">${(p.activeHotelName||"B").trim().charAt(0).toUpperCase()}</div>`;n.innerHTML=`
    <div id="iosInstallSheetCard" style="background:#fff;width:100%;max-width:440px;border-radius:20px 20px 0 0;padding:24px 22px 32px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        ${d}
        <div><div style="font-size:16px;font-weight:800;color:#1a1a2e;">${e||"Install app"}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">${t||""}</div></div>
      </div>
      ${r?`<a href="${r}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;width:100%;margin-bottom:16px;padding:12px;border-radius:11px;border:1.5px solid #2E7D5B;background:none;color:#2E7D5B;font-size:14px;font-weight:700;">Open booking page →</a>`:""}
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</span><div style="font-size:14px;color:#374151;line-height:1.4;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Tap the <strong>Share</strong> button <i data-lucide="share" style="width:18px;height:18px;color:#007aff;vertical-align:middle;"></i> in Safari's bar</div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span><div style="font-size:14px;color:#374151;line-height:1.4;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">Scroll down and tap <strong>Add to Home Screen</strong> <i data-lucide="square-plus" style="width:18px;height:18px;color:#2E7D5B;vertical-align:middle;"></i></div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:26px;height:26px;border-radius:50%;background:#f0fdf4;color:#2E7D5B;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</span><div style="font-size:14px;color:#374151;line-height:1.4;">Tap <strong>Add</strong> — done! It's on your home screen.</div></div>
      </div>
      <button id="iosInstallSheetDone" style="width:100%;margin-top:22px;padding:14px;border-radius:12px;border:none;background:#2E7D5B;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">Got it</button>
    </div>`,document.body.appendChild(n),typeof lucide<"u"&&lucide.createIcons();const l=()=>n.remove();n.addEventListener("click",m=>{m.target===n&&l()});const x=document.getElementById("iosInstallSheetCard");x&&x.addEventListener("click",m=>m.stopPropagation());const u=document.getElementById("iosInstallSheetDone");u&&(u.onclick=l)}function M(){if(localStorage.getItem("settingsTourDone"))return;let e=parseInt(localStorage.getItem("settingsTourStep")||"0");const t=[{target:"",text:"",openAccordion:!1,tab:"settings",customModal:"homescreen"},{target:"#edit-hotel-phone",text:"Tap any field here to edit your hotel info — name, address, phone.",openAccordion:!1,tab:"settings"},{target:"#editRoomsCards .booking-card > div:first-child",text:"Add a photo of your room — guests book more when they see one.",openAccordion:!1,tab:"settings"},{target:"#edit-rate-nightly",text:"You can change your rates here — nightly, weekly, and monthly.",openAccordion:!0,targetParent:!0,tab:"settings"},{target:'button[onclick*="copyBookingLink"]',text:"This is your booking URL — the link guests use to book with you directly.",openAccordion:!1,tab:"settings"},{target:'button[onclick*="openPreviewSite"]',text:"Preview your booking engine to see exactly what your guests see.",openAccordion:!1,tab:"settings"},{target:"#edit-new-pin",text:"This is your login PIN — you'll need it to access this dashboard next time. You can change it here anytime.",openAccordion:!0,tab:"settings"},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:!0},{target:"#availabilityCalendarWrap",text:"",openAccordion:!1,tab:"availability",customModal:"availability"},{target:".revenue-savings-pill",text:"See how much revenue your booking page generates and how much you're saving vs OTA commissions.",openAccordion:!1,tab:"revenue",waitForVisible:!0},{target:"#paymentsExplainer",text:"When guests book through your engine, their card is verified but never charged. This prevents no-shows — and you collect payment however you want when they physically check in.",openAccordion:!1,tab:"revenue",waitForVisible:!0,tooltipPosition:"above"},{target:"#bookingsList",text:"",openAccordion:!1,tab:"bookings",customModal:"finale"}];function o(){const a=document.getElementById("tourTooltip");a&&a.remove();const s=document.getElementById("tourBlurOverlay");s&&s.remove(),document.querySelectorAll("[data-tour-highlighted]").forEach(c=>{c.style.position=c.dataset.tourOrigPosition||"",c.style.zIndex="",c.style.boxShadow="",c.removeAttribute("data-tour-highlighted"),delete c.dataset.tourOrigPosition}),document.body.style.overflow=""}function r(){o(),u()}function i(){if(o(),e>=t.length){localStorage.setItem("settingsTourDone","1"),localStorage.removeItem("settingsTourStep");return}const a=t[e];if(a.tab==="revenue"&&!p.revenueEnabled){e++,localStorage.setItem("settingsTourStep",String(e)),i();return}if(a.tab&&a.tab!==p.currentFilter){const s=document.querySelector(`.tab[data-nav-filter="${a.tab}"]`)||document.querySelector(`.mobile-nav-item[data-nav-filter="${a.tab}"]`);s&&setFilter(a.tab,s),a.customModal?setTimeout(()=>{n(a)},150):setTimeout(()=>{n(a)},800);return}setTimeout(()=>{n(a)},100)}function n(a){if(a.customModal==="homescreen"){x();return}if(a.customModal===!0||a.customModal==="bookings"){h();return}if(a.customModal==="availability"){w();return}if(a.customModal==="finale"){u();return}if(a.waitForVisible){const g=a.target.split(",").map(f=>f.trim());let b=0;const v=20,y=()=>{b++;let f=null;for(const k of g){if(f=document.querySelector(k),f&&f.offsetParent!==null)break;f=null}f?d(f,a):b<v?setTimeout(y,200):(e++,localStorage.setItem("settingsTourStep",String(e)),i())};y();return}let s=null;const c=a.target.split(",").map(g=>g.trim());for(const g of c){if(s=document.querySelector(g),s&&!a.openAccordion&&s.offsetParent===null&&getComputedStyle(s).position!=="fixed"){s=null;continue}if(s)break}if(!s){e++,localStorage.setItem("settingsTourStep",String(e)),i();return}d(s,a)}function d(a,s){if(s.openAccordion){const g=a.closest(".accordion-body");if(g&&g.style.display==="none"){g.style.display="block";const b=g.previousElementSibling?.querySelector(".accordion-arrow");b&&(b.style.transform="rotate(90deg)")}}s.targetParent&&(a=a.closest(".booking-card")||a.closest(".accordion-body")||a);const c=document.createElement("div");c.id="tourBlurOverlay",c.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);",document.body.appendChild(c),document.body.style.overflow="hidden",a.dataset.tourOrigPosition||(a.dataset.tourOrigPosition=a.style.position||""),a.style.position=a.style.position||"relative",a.style.zIndex="99999",a.style.isolation="isolate",a.style.boxShadow="0 0 0 4px #2E7D5B, 0 0 20px rgba(46,125,91,0.3)",a.setAttribute("data-tour-highlighted","1"),a.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{l(a,s)},500)}function l(a,s){const c=a.getBoundingClientRect(),g=document.createElement("div");g.id="tourTooltip";const b=window.innerHeight-c.bottom,v=c.top,y=Math.min(280,window.innerWidth-32),f=c.left+c.width/2,k=Math.max(16,Math.min(f-y/2,window.innerWidth-y-16)),B=Math.max(20,Math.min(f-k,y-20)),z='<div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>',E=s.tooltipPosition||(b>130?"below":v>130?"above":"center");E==="below"?(g.style.cssText=`position:fixed;z-index:100000;left:${k}px;top:${c.bottom+12}px;max-width:${y}px;width:${y}px;`,g.innerHTML=`
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid #1a1a2e;margin-left:${B-8}px;"></div>
        <div style="background:#1a1a2e;border-radius:10px;padding:14px 18px;color:white;font-size:13px;line-height:1.5;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);">
          <p style="margin:0 0 12px;">${s.text}</p>
          <button id="tourNextBtn" style="padding:8px 20px;border-radius:6px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e<t.length-1?"Next →":"Got it!"}</button>
          ${z}
        </div>`):E==="above"?(g.style.cssText=`position:fixed;z-index:100000;left:${k}px;bottom:${window.innerHeight-c.top+12}px;max-width:${y}px;width:${y}px;`,g.innerHTML=`
        <div style="background:#1a1a2e;border-radius:10px;padding:14px 18px;color:white;font-size:13px;line-height:1.5;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);">
          <p style="margin:0 0 12px;">${s.text}</p>
          <button id="tourNextBtn" style="padding:8px 20px;border-radius:6px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e<t.length-1?"Next →":"Got it!"}</button>
          ${z}
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #1a1a2e;margin-left:${B-8}px;"></div>`):(g.style.cssText=`position:fixed;z-index:100000;left:50%;top:50%;transform:translate(-50%,-50%);max-width:${y}px;width:${y}px;`,g.innerHTML=`
        <div style="background:#1a1a2e;border-radius:10px;padding:14px 18px;color:white;font-size:13px;line-height:1.5;font-weight:500;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);">
          <p style="margin:0 0 12px;">${s.text}</p>
          <button id="tourNextBtn" style="padding:8px 20px;border-radius:6px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">${e<t.length-1?"Next →":"Got it!"}</button>
          ${z}
        </div>`),document.body.appendChild(g),document.getElementById("tourNextBtn").onclick=()=>{o(),e++,localStorage.setItem("settingsTourStep",String(e)),i()},document.getElementById("tourSkipBtn").onclick=()=>{r()}}function x(){const a=document.createElement("div");a.id="tourBlurOverlay",a.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(a),document.body.style.overflow="hidden";const s=p.activeHotelName||"Your Hotel",c=s.trim().charAt(0).toUpperCase(),g=s.length>10?s.slice(0,10):s,b="width:32px;display:flex;flex-direction:column;align-items:center;gap:5px;",v="width:32px;height:32px;border-radius:9px;box-sizing:border-box;",y="height:8px;max-width:46px;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",f=`<div style="${b}"><div style="${v}background:rgba(255,255,255,0.22);"></div><div style="${y}"></div></div>`,k=`<div style="${b}"><div style="${v}background:#fff;color:#2E7D5B;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.28);">${c}</div><div style="${y}font-size:7.5px;color:#fff;font-weight:700;">${g}</div></div>`,B=[f,f,f,f,k,f,f,f].join(""),z=document.createElement("div");if(z.id="tourTooltip",z.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:20px 16px;",z.innerHTML=`
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
          <p style="font-size:13px;color:#4b5563;line-height:1.55;margin:0 0 14px;">Guests can install <strong>${s}</strong> as an app — right next to their other apps. No Safari, no searching <span style="text-decoration:line-through;color:#9ca3af;">Booking.com</span> or <span style="text-decoration:line-through;color:#9ca3af;">Airbnb</span>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
            <p style="font-size:13px;color:#166534;margin:0;line-height:1.5;">They just <strong>tap your icon and book direct</strong> — every single time. No OTA commission, and they never drift to a competitor.</p>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 16px;line-height:1.5;">Your guests get a "Tap to Install" button on your booking page. Upload your icon anytime on the Apps tab.</p>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Show me around →</button>
          <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:#9ca3af;font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
        </div>
      </div>`,document.body.appendChild(z),!document.getElementById("tourModalAnimStyle")){const E=document.createElement("style");E.id="tourModalAnimStyle",E.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(E)}document.getElementById("tourNextBtn").onclick=()=>{o(),e++,localStorage.setItem("settingsTourStep",String(e)),i()},document.getElementById("tourSkipBtn").onclick=()=>{r()}}function u(){const a=document.createElement("div");a.id="tourBlurOverlay",a.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(a),document.body.style.overflow="hidden";const s=document.createElement("div");if(s.id="tourTooltip",s.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",s.innerHTML=`
      <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
        <div style="padding:24px 20px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">🚀</div>
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
            </div>
          </div>
          <div style="background:#fff7ed;border-radius:10px;padding:10px 12px;border:1px solid #fed7aa;margin-bottom:16px;">
            <p style="font-size:12px;color:#9a3412;margin:0;line-height:1.5;">⚠️ We're not an ad agency — you won't get bookings unless you get your link in front of people.</p>
          </div>
          <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">📋 Copy my link & let's go!</button>
        </div>
      </div>`,document.body.appendChild(s),!document.getElementById("tourModalAnimStyle")){const c=document.createElement("style");c.id="tourModalAnimStyle",c.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(c)}document.getElementById("tourNextBtn").onclick=()=>{const g="https://"+(p.activeHotelDomain||p.activeHotelId+".bookmarketel.com");navigator.clipboard.writeText(g).catch(()=>{}),o(),localStorage.setItem("settingsTourDone","1"),localStorage.setItem("linkCopied","1"),localStorage.removeItem("settingsTourStep"),toast("Booking link copied!","success"),m()}}function m(a){const s=document.createElement("div");s.id="testDriveOverlay",s.style.cssText="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px 16px;",s.innerHTML=`
      <div style="background:white;border-radius:20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
        <div style="padding:28px 22px;text-align:center;">
          <div style="font-size:36px;margin-bottom:12px;">🚀</div>
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
          <button id="activateNowBtn" style="width:100%;padding:16px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">$99/mo — Go Live Now</button>
          <p style="font-size:11px;color:#6b7280;margin:0 0 16px;">Cancel anytime · No contracts</p>
          <button id="activateLaterBtn" style="background:none;border:none;color:#9ca3af;font-size:12px;font-family:inherit;cursor:pointer;padding:6px 12px;">Not ready yet — keep my page inactive</button>
        </div>
      </div>`,document.body.appendChild(s),document.getElementById("activateNowBtn").onclick=()=>{s.remove();const c=p.token;fetch("/api/crm/go-live",{method:"POST",headers:{"Content-Type":"application/json","x-crm-token":c},body:JSON.stringify({hotelId:p.activeHotelId})}).then(g=>g.json()).then(g=>{g.success&&g.url?window.location.href=g.url:toast("Something went wrong. Try again.","error")}).catch(()=>toast("Something went wrong. Try again.","error"))},document.getElementById("activateLaterBtn").onclick=()=>{s.remove();const c=document.querySelector('.tab[data-nav-filter="bookings"]')||document.querySelector('.mobile-nav-item[data-nav-filter="bookings"]');c&&setFilter("bookings",c)}}function w(){const a=document.createElement("div");a.id="tourBlurOverlay",a.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(a),document.body.style.overflow="hidden";let s=0;const c=[`<div style="padding:20px 18px 0;">
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
      </div>`],g=document.createElement("div");g.id="tourTooltip",g.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;";function b(){const y=s>=c.length-1?"Next — Revenue →":"Next →";g.innerHTML=`
        <div style="background:white;border-radius:20px;max-width:340px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:tourModalSlideUp 0.3s ease;">
          ${c[s]}
          <div style="padding:4px 18px 6px;text-align:center;">
            <div style="display:flex;justify-content:center;gap:6px;margin-bottom:10px;">
              ${c.map((f,k)=>`<div style="width:8px;height:8px;border-radius:50%;background:${k===s?"#2E7D5B":"#D8E4DC"};"></div>`).join("")}
            </div>
          </div>
          <div style="padding:0 18px 20px;text-align:center;">
            <button id="tourNextBtn" style="width:100%;padding:14px 20px;border-radius:12px;border:none;background:#2E7D5B;color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${y}</button>
            <div style="margin-top:8px;"><button id="tourSkipBtn" style="background:none;border:none;color:rgba(0,0,0,0.35);font-size:11px;font-family:inherit;cursor:pointer;padding:4px 8px;">Skip tour</button></div>
          </div>
        </div>`,document.getElementById("tourNextBtn").onclick=()=>{s<c.length-1?(s++,b()):(o(),e++,localStorage.setItem("settingsTourStep",String(e)),i())},document.getElementById("tourSkipBtn").onclick=()=>{r()}}if(document.body.appendChild(g),b(),!document.getElementById("tourModalAnimStyle")){const v=document.createElement("style");v.id="tourModalAnimStyle",v.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(v)}}function h(){const a=document.createElement("div");a.id="tourBlurOverlay",a.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);",document.body.appendChild(a),document.body.style.overflow="hidden";const s=document.createElement("div");if(s.id="tourTooltip",s.style.cssText="position:fixed;z-index:100000;inset:0;display:flex;align-items:center;justify-content:center;padding:24px 16px;",s.innerHTML=`
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
                <span style="background:#eff6ff;color:#1e40af;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">💳 Pay at check-in</span>
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
      </div>`,document.body.appendChild(s),!document.getElementById("tourModalAnimStyle")){const c=document.createElement("style");c.id="tourModalAnimStyle",c.textContent="@keyframes tourModalSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}",document.head.appendChild(c)}document.getElementById("tourNextBtn").onclick=()=>{o(),e++,localStorage.setItem("settingsTourStep",String(e)),i()},document.getElementById("tourSkipBtn").onclick=()=>{r()}}i()}async function D(){const e=document.getElementById("editRoomsList");if(e){e.innerHTML='<div class="loading"><div class="logo-sprite-bounce"></div> Loading…</div>';try{const t=await api("GET","/api/crm/rooms");if(!t.rooms)throw new Error("No data");p.editRooms=t.rooms;const o=await api("GET","/api/crm/verify"),r=o?.hotelName||"";r&&(p.activeHotelName=r);const i=o?.hotelSubtitle||"",n=o?.hotelAddress||"",d=o?.hotelPhone||"",l=o?.appIconUrl||"";p.activeHotelAppIcon=l,updateFrontdeskManifestLink();let x={nightly:69,weekly:299,monthly:999,taxRate:.1};t.rates&&(x=t.rates);const m="https://"+(o?.domain||p.activeHotelId+".bookmarketel.com"),w="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(m);let h=`
      <button onclick="openPreviewSite()" style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--green);color:white;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:14px;">Preview Your Site →</button>
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Header Preview — tap any field to edit</div>
          <div style="background:#f4f7f9;border-radius:12px;padding:20px 16px;text-align:center;border:1px solid var(--border);">
            <input type="text" value="${n}" id="edit-hotel-address" placeholder="123 Main St, City, State" style="width:100%;text-align:center;font-size:13px;color:#555;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${r}" id="edit-hotel-name" placeholder="Your Hotel Name" style="width:100%;text-align:center;font-size:24px;font-weight:700;color:#007bff;border:none;background:transparent;outline:none;margin-bottom:4px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="text" value="${i}" id="edit-hotel-subtitle" placeholder="Your subtitle or slogan" style="width:100%;text-align:center;font-size:14px;color:#333;border:none;background:transparent;outline:none;margin-bottom:6px;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
            <input type="tel" value="${d}" id="edit-hotel-phone" placeholder="(555) 123-4567" style="width:100%;text-align:center;font-size:13px;color:#6b7280;border:none;background:transparent;outline:none;font-family:inherit;border-bottom:1.5px dashed var(--border);padding-bottom:4px;">
          </div>
          <button onclick="saveHotelInfo()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-top:10px;">Save</button>
        </div>
      </div>
      <div id="editRoomsCards"></div>
      <button style="width:100%; padding:14px; border-radius:14px; border:1.5px dashed var(--border); background:none; font-family:inherit; font-size:14px; font-weight:600; color:var(--text-muted); cursor:pointer; margin-top:12px; margin-bottom:14px;" onclick="openEditAddRoom()">+ Add room type</button>
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
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:18px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);">Your Booking Link</div>
          <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;text-align:center;">
            <div style="font-size:15px;font-weight:600;color:var(--green);word-break:break-all;margin-bottom:10px;">${m}</div>
            <button onclick="copyBookingLink('${m.replace(/'/g,"\\'")}')" style="padding:8px 18px;border-radius:8px;border:none;background:var(--green);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">📋 Copy Link</button>
          </div>
          <div style="text-align:center;margin-bottom:10px;">
            <img src="${w}" alt="QR Code" style="width:140px;height:140px;border-radius:8px;border:1px solid var(--border);">
          </div>
          <p style="font-size:11px;color:var(--text-muted);text-align:center;margin:0;">Add this to your Google Business, website, or text it to guests.</p>
        </div>
      </div>
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Rates</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Nightly</div>
              <input type="number" value="${x.nightly}" id="edit-rate-nightly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Weekly</div>
              <input type="number" value="${x.weekly}" id="edit-rate-weekly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:4px;">Monthly</div>
              <input type="number" value="${x.monthly}" id="edit-rate-monthly" min="1" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:16px;outline:none;">
            </div>
          </div>
          <button onclick="saveRates()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Rates</button>
        </div>
      </div>
      <div class="booking-card" style="margin-bottom:14px;">
        <div style="padding:14px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="toggleSection(this)">
          <div style="font-size:14px;font-weight:700;color:var(--text);">Change PIN</div>
          <span style="font-size:18px;color:var(--text-muted);transition:transform 0.2s;" class="accordion-arrow">›</span>
        </div>
        <div class="accordion-body" style="display:none;padding:0 18px 18px;">
          <div style="margin-bottom:12px;">
            <input type="text" id="edit-new-pin" value="${p.token}" placeholder="Enter new PIN (min 4 chars)" style="width:100%;font-size:16px;padding:8px 10px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;outline:none;text-align:center;letter-spacing:2px;">
          </div>
          <button onclick="changePin()" style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Update PIN</button>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:center;">You'll need to use the new PIN next time you log in.</p>
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
    `;e.innerHTML=h,S(),typeof lucide<"u"&&lucide.createIcons(),setTimeout(()=>{p.currentFilter==="settings"&&localStorage.getItem("onboardingDone")&&!localStorage.getItem("settingsTourDone")&&!document.getElementById("welcomeModalOverlay")&&M()},300)}catch{e.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>'}}}function $(){S()}function S(){const e=document.getElementById("editRoomsCards")||document.getElementById("editRoomsList");if(!p.editRooms.length){e.innerHTML='<div class="empty-state"><div class="empty-icon">🛏️</div><div class="empty-text">No rooms yet</div><div class="empty-sub">Add your first room type below.</div></div>';return}e.innerHTML=p.editRooms.map(t=>{const o=(t.amenities||"").split("•").map(i=>i.trim()).filter(Boolean),r=t.images||[];return`
    <div class="booking-card" style="margin-bottom:14px;" id="edit-card-${t.id}">
      <div style="position:relative;">
        ${r.length?`<img src="${r[0].url}" loading="lazy" decoding="async" style="width:100%;height:200px;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';">`:'<div style="width:100%;height:120px;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;">No photos yet</div>'}
        <label style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.65);color:white;padding:6px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
          📷 + Add Photos
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadEditImages(event,'${t.id}')">
        </label>
      </div>
      ${r.length>1?'<div style="padding:10px 18px 0;display:flex;gap:8px;overflow-x:auto;">'+r.map(i=>`<div style="position:relative;flex-shrink:0;"><img src="${i.url}" loading="lazy" decoding="async" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1.5px solid var(--border);" onerror="this.onerror=null;this.src='https://suitestay.clickinns.com/kingbedsuitestay.webp';"><button onclick="deleteEditImage('${t.id}','${i.id}')" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:white;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button></div>`).join("")+"</div>":""}
      <div style="padding:18px;">
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
            ${o.map(i=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--green-pale);color:var(--green);padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;">${j(i)} ${i} <button onclick="removeAmenity('${t.id}','${i.replace(/'/g,"\\'")}')" style="background:none;border:none;color:var(--green);cursor:pointer;font-size:14px;margin-left:2px;">×</button></span>`).join("")}
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
    </div>`}).join("")}function j(e){const t=e.toLowerCase();return t.includes("wifi")?'<i data-lucide="wifi" style="width:14px;height:14px;"></i>':t.includes("tv")||t.includes("television")?'<i data-lucide="tv" style="width:14px;height:14px;"></i>':t.includes("fridge")||t.includes("refrigerator")?'<i data-lucide="thermometer-snowflake" style="width:14px;height:14px;"></i>':t.includes("parking")?'<i data-lucide="car" style="width:14px;height:14px;"></i>':t.includes("housekeeping")||t.includes("cleaning")?'<i data-lucide="sparkles" style="width:14px;height:14px;"></i>':t.includes("bath")||t.includes("shower")?'<i data-lucide="bath" style="width:14px;height:14px;"></i>':t.includes("work")||t.includes("desk")?'<i data-lucide="laptop" style="width:14px;height:14px;"></i>':t.includes("pet")||t.includes("dog")?'<i data-lucide="paw-print" style="width:14px;height:14px;"></i>':t.includes("pool")?'<i data-lucide="waves" style="width:14px;height:14px;"></i>':t.includes("kitchen")||t.includes("microwave")?'<i data-lucide="cooking-pot" style="width:14px;height:14px;"></i>':'<i data-lucide="check" style="width:14px;height:14px;"></i>'}const U=[{key:"wifi",label:"Free WiFi",icon:"wifi"},{key:"tv",label:"Smart TV",icon:"tv"},{key:"fridge",label:"Fridge",icon:"thermometer-snowflake"},{key:"parking",label:"Free Parking",icon:"car"},{key:"housekeeping",label:"Weekly Housekeeping",icon:"sparkles"},{key:"bath",label:"Bath",icon:"bath"},{key:"workstation",label:"Workstation",icon:"laptop"},{key:"pet",label:"Pet Friendly",icon:"paw-print"},{key:"pool",label:"Pool",icon:"waves"},{key:"kitchen",label:"Kitchenette",icon:"cooking-pot"},{key:"ac",label:"Air Conditioning",icon:"wind"},{key:"laundry",label:"Laundry",icon:"shirt"}];let A=null;function Y(e){A=e;const o=(p.editRooms.find(n=>n.id===e)?.amenities||"").split("•").map(n=>n.trim().toLowerCase()).filter(Boolean);let r=document.getElementById("amenityPickerModal");r||(document.body.insertAdjacentHTML("beforeend",`
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
    `),document.getElementById("amenityPickerModal").addEventListener("click",P),r=document.getElementById("amenityPickerModal"));const i=document.getElementById("amenityPickerGrid");i.innerHTML=U.map(n=>{const d=o.some(l=>l.includes(n.key));return`<button onclick="toggleAmenityPreset(this,'${n.key}')" data-key="${n.key}" style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${d?"#2E7D5B":"#e5e7eb"};background:${d?"#E8F5EE":"white"};color:${d?"#2E7D5B":"#1a1a2e"};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;"><i data-lucide="${n.icon}" style="width:14px;height:14px;"></i> ${n.label}</button>`}).join(""),document.getElementById("amenityCustomInput").value="",r.style.display="flex",typeof lucide<"u"&&lucide.createIcons()}function pe(e,t){const o=e.style.borderColor==="rgb(46, 125, 91)";e.style.borderColor=o?"#e5e7eb":"#2E7D5B",e.style.background=o?"white":"#E8F5EE",e.style.color=o?"#1a1a2e":"#2E7D5B"}function P(){document.getElementById("amenityPickerModal").style.display="none",A=null}function ce(){const e=p.editRooms.find(i=>i.id===A);if(!e){P();return}const t=document.getElementById("amenityPickerGrid"),o=[];t.querySelectorAll("button").forEach(i=>{if(i.style.background==="rgb(232, 245, 238)"){const n=U.find(d=>d.key===i.dataset.key);n&&o.push(n.label)}});const r=document.getElementById("amenityCustomInput").value.trim();r&&o.push(r),e.amenities=o.join(" • "),P(),$(),typeof lucide<"u"&&lucide.createIcons()}function ge(e){Y(e)}function xe(e,t){const o=p.editRooms.find(i=>i.id===e);if(!o)return;const r=(o.amenities||"").split("•").map(i=>i.trim()).filter(Boolean);o.amenities=r.filter(i=>i!==t).join(" • "),$(),typeof lucide<"u"&&lucide.createIcons()}async function ue(){const e=document.getElementById("edit-hotel-name")?.value.trim(),t=document.getElementById("edit-hotel-subtitle")?.value.trim(),o=document.getElementById("edit-hotel-address")?.value.trim(),r=document.getElementById("edit-hotel-phone")?.value.trim(),i=document.getElementById("edit-hotel-policy")?.value.trim();try{await api("POST","/api/crm/hotel-info",{name:e,subtitle:t,address:o,phone:r,cancellationPolicy:i}),toast("Hotel info saved!","success")}catch{toast("Failed to save","error")}}async function me(){const e=parseFloat(document.getElementById("edit-rate-nightly")?.value)||69,t=parseFloat(document.getElementById("edit-rate-weekly")?.value)||299,o=parseFloat(document.getElementById("edit-rate-monthly")?.value)||999;try{await api("POST","/api/crm/rates",{nightly:e,weekly:t,monthly:o}),localStorage.setItem("ratesChanged","1"),I(),toast("Rates saved!","success")}catch{toast("Failed to save rates","error")}}async function fe(){const e=document.getElementById("edit-new-pin")?.value.trim();if(!e||e.length<4){toast("PIN must be at least 4 characters","error");return}try{await api("POST","/api/crm/change-pin",{newPin:e}),p.token=e;try{localStorage.setItem("crmToken",p.token)}catch{}toast("PIN updated!","success")}catch{toast("Failed to change PIN","error")}}function ye(e){navigator.clipboard.writeText(e).then(()=>{toast("Booking link copied!","success")}).catch(()=>{toast("Failed to copy","error")})}function be(e){const t=e.nextElementSibling,o=e.querySelector(".accordion-arrow");t.style.display==="none"?(t.style.display="block",o&&(o.style.transform="rotate(90deg)")):(t.style.display="none",o&&(o.style.transform="rotate(0deg)"))}async function he(){try{const e=await api("POST","/api/crm/go-live");e.success&&e.url?window.location.href=e.url:toast(e.message||"Failed to start checkout","error")}catch{toast("Failed to start checkout. Try again.","error")}}async function ve(){try{const e=await api("GET","/api/crm/billing-portal");e.success&&e.url?window.location.href=e.url:toast(e.message||"Contact support@bookmarketel.com to manage your subscription.","error")}catch{toast("Contact support@bookmarketel.com to manage your subscription.","error")}}async function we(){const e=document.getElementById("supportMessage")?.value.trim();if(!e){toast("Please enter a message","error");return}try{await api("POST","/api/crm/support",{message:e}),document.getElementById("supportMessage").value="",toast("Message sent! We'll reply to your email.","success")}catch{toast("Failed to send. Email support@bookmarketel.com directly.","error")}}async function ke(e){const t=p.editRooms.find(l=>l.id===e);if(!t){toast("Room not found — try refreshing","error");return}const o=document.getElementById("edit-name-"+e)?.value.trim(),r=document.getElementById("edit-desc-"+e)?.value.trim(),i=parseInt(document.getElementById("edit-occ-"+e)?.value)||4,n=parseInt(document.getElementById("edit-units-"+e)?.value)||1,d={id:e,name:o||t.name,description:r||"",amenities:t.amenities||"",maxOccupancy:i,totalUnits:n};try{const l=await api("POST","/api/crm/rooms",d);if(l&&l.success===!1){toast(l.message||"Failed to save","error");return}t.name=d.name,t.description=d.description,t.maxOccupancy=i,t.totalUnits=n,toast("Room saved!","success")}catch(l){toast("Failed to save: "+(l.message||""),"error")}}async function ze(e,t){const o=Array.from(e.target.files);if(!o.length)return;const i=document.getElementById("edit-card-"+t)?.querySelector("div:first-child");i&&(i.style.position="relative",i.insertAdjacentHTML("beforeend",'<div id="upload-spinner-'+t+'" style="position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:5;flex-direction:column;gap:6px;"><div style="width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 0.7s linear infinite;"></div><div id="upload-progress-'+t+'" style="font-size:12px;color:var(--text-muted);font-weight:600;">0 / '+o.length+"</div></div>"));let n=0;for(const l of o){const x=await L(l),u=new FormData;u.append("image",x,x.name||"room.webp");try{const h=await(await fetch(`/api/crm/rooms/${t}/images`,{method:"POST",headers:{"x-crm-token":u.token},body:u})).json();if(h.success&&h.image){const a=u.editRooms.find(s=>s.id===t);a&&(a.images||(a.images=[]),a.images.push(h.image),a.imageUrl||(a.imageUrl=h.image.url)),n++}}catch{}const m=document.getElementById("upload-progress-"+t);m&&(m.textContent=n+" / "+o.length)}const d=document.getElementById("upload-spinner-"+t);d&&d.remove(),S(),I(),toast(n+" photo"+(n!==1?"s":"")+" added. Check the Bookings tab to continue your launch checklist!","success")}function q(e,t=512){return new Promise((o,r)=>{const i=new Image,n=URL.createObjectURL(e);i.onload=()=>{try{const d=Math.min(i.naturalWidth,i.naturalHeight),l=(i.naturalWidth-d)/2,x=(i.naturalHeight-d)/2,u=document.createElement("canvas");u.width=t,u.height=t;const m=u.getContext("2d");m.imageSmoothingQuality="high",m.drawImage(i,l,x,d,d,0,0,t,t),URL.revokeObjectURL(n),u.toBlob(w=>w?o(w):r(new Error("crop failed")),"image/png",.92)}catch(d){URL.revokeObjectURL(n),r(d)}},i.onerror=()=>{URL.revokeObjectURL(n),r(new Error("load failed"))},i.src=n})}function G(){const e=document.getElementById("appsAppIconPreview");e&&(e.innerHTML='<div style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.5);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>')}function W(e){const t=document.getElementById("appsAppIconPreview");t&&(t.style.background="#fff",t.innerHTML='<img src="'+e+'" alt="App icon" style="width:100%;height:100%;object-fit:cover;">')}async function Ee(e){const t=e.files&&e.files[0];if(!t)return;G();const o=new FormData;try{const r=await q(t,512);o.append("icon",r,"app-icon.png")}catch{o.append("icon",t)}try{const i=await(await fetch("/api/crm/hotel-app-icon",{method:"POST",headers:{"x-crm-token":o.token},body:o})).json();if(i.success&&i.appIconUrl){o.activeHotelAppIcon=i.appIconUrl,W(i.appIconUrl);const n=document.getElementById("appsView");n&&(n.dataset.appsKey=(o.activeHotelId||"")+"|"+i.appIconUrl+"|"+(o.activeHotelDomain||"")),typeof updateFrontdeskManifestLink=="function"&&updateFrontdeskManifestLink(),toast("Logo updated! Guests will see it on their phone.","success")}else{toast(i.message||"Failed to upload icon","error");const n=(o.activeHotelName||"H").trim().charAt(0).toUpperCase()||"🏨",d=document.getElementById("appsAppIconPreview");d&&(d.style.background="var(--green)",d.innerHTML=n)}}catch{toast("Failed to upload icon","error")}e.value=""}async function Ie(e,t){if(confirm("Delete this photo?"))try{await api("DELETE",`/api/crm/rooms/${e}/images/${t}`);const o=p.editRooms.find(r=>r.id===e);o&&o.images&&(o.images=o.images.filter(r=>r.id!==t),o.imageUrl=o.images[0]?.url||null),S(),toast("Photo deleted","success")}catch{toast("Failed to delete","error")}}async function Se(e){if(confirm("Delete this room type?"))try{await api("DELETE",`/api/crm/rooms/${e}`),toast("Room deleted","success"),D()}catch{toast("Failed to delete","error")}}function Be(){const e=document.getElementById("editRoomsList");document.getElementById("editAddForm")||(e.insertAdjacentHTML("beforeend",`
    <div id="editAddForm" class="booking-card" style="margin-bottom:12px; border-color:var(--green);">
      <div style="padding:16px;">
        <input type="text" id="editNewRoomName" placeholder="Room type name (e.g. King Suite)" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:16px;outline:none;margin-bottom:10px;">
        <div style="display:flex;gap:8px;">
          <button onclick="confirmEditAddRoom()" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--green);color:white;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
          <button onclick="document.getElementById('editAddForm').remove()" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border);background:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);">Cancel</button>
        </div>
      </div>
    </div>
  `),document.getElementById("editNewRoomName").focus())}function Te(){const e=document.getElementById("editNewRoomName").value.trim();e&&api("POST","/api/crm/rooms",{name:e,maxOccupancy:4,totalUnits:5}).then(()=>{toast("Room added","success"),D()}).catch(()=>toast("Failed to add","error"))}const _={addAmenityPrompt:ge,advanceTourIfNeeded:I,changePin:fe,checklistGoTo:X,checklistGoToRates:J,closeAmenityPicker:P,confirmAmenityPicker:ce,confirmEditAddRoom:Te,copyBookingLink:ye,copyBookingLinkFromChecklist:K,deleteEditImage:Ie,deleteEditRoom:Se,frontdeskInstallCardHtml:R,getAmenityIcon:j,goLive:he,handleInstallFrontdesk:de,loadEditRooms:D,loadSettings:N,maybePromptInstalledNotifications:le,openAmenityPicker:Y,openBillingPortal:ve,openEditAddRoom:Be,openPreviewSite:ie,refreshFrontdeskInstallCard:C,removeAmenity:xe,renderEditRooms:$,renderEditRoomsCards:S,saveEditRoom:ke,saveHotelInfo:ue,saveRates:me,sendSupportMessage:we,setAppIconPreviewImage:W,setAppIconPreviewLoading:G,settingsChangePin:te,settingsCopyLink:Q,settingsSaveRates:ee,settingsSendSupport:oe,settingsUploadPhoto:Z,showActivatedModal:ae,showIosInstallSheet:O,showNotifPromptModal:F,showOnboardingQuestions:re,showWelcomeModal:H,squareCropImage:q,startSettingsTour:M,toggleAmenityPreset:pe,toggleAppNotifications:se,toggleSection:be,updatePreviewSiteBar:ne,uploadAppIcon:Ee,uploadEditImages:ze};function Pe(){V(_)}const De=Object.freeze(Object.defineProperty({__proto__:null,default:_,install:Pe},Symbol.toStringTag,{value:"Module"}));export{Ce as a,De as b,V as e,p as f,Me as s};
