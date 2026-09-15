document.addEventListener("DOMContentLoaded",()=>{
 const form=document.querySelector("#bookingForm"),success=document.querySelector("#bookingSuccess");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  try{
   const r=await fetch("http://localhost:3000/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const x=await r.json(); if(!r.ok)throw Error(x.message);
   success.classList.remove("hidden"); success.innerHTML=`✓ Booking received! Your Booking ID is <strong>${x.booking.id}</strong>.`;
   form.reset();
  }catch(err){alert("Booking could not be submitted. Start the NIRAMAY backend first.");console.error(err)}
 });
});