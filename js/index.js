// Add your Cloudinary cloud name and unsigned upload preset to enable direct image uploads.
const CLOUDINARY_CLOUD_NAME = '';
const CLOUDINARY_UPLOAD_PRESET = '';
// Add your Formspree/Basin form endpoint to deliver the message bucket and attachments.
const CONTACT_ENDPOINT = '';
const gallery = document.querySelector('#gallery-grid');
const modals = [...document.querySelectorAll('.modal-backdrop')];
let selectedImageUrl = '';
let activeImages = [];
let activeIndex = 0;
let queuedPosts = [];
let audioContext;
let musicOscillators = [];
let musicGain;
const media = new Audio('https://res.cloudinary.com/mnjeetvr/video/upload/v1795497748/Enchanting_Flute.mp3');
media.loop = true;
media.preload = 'none';
media.volume = 0.25;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const openModal = (element) => { element.classList.add('open'); document.body.style.overflow='hidden'; element.querySelector('.modal-close')?.focus(); };
const closeModal = (element) => { element.classList.remove('open'); if(!document.querySelector('.modal-backdrop.open')) document.body.style.overflow=''; };
document.querySelectorAll('[data-open="studio"]').forEach(button=>button.addEventListener('click',()=>openModal(document.querySelector('#studio-modal'))));
document.querySelectorAll('[data-open="contact"],a[href="#contact"]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();openModal(document.querySelector('#contact-modal'))}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.closest('.modal-backdrop'))));
modals.forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModal(modal)}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const opened=document.querySelector('.modal-backdrop.open');if(opened)closeModal(opened)}if(document.querySelector('#lightbox.open')&&event.key==='ArrowRight')showImage(activeIndex+1);if(document.querySelector('#lightbox.open')&&event.key==='ArrowLeft')showImage(activeIndex-1)});
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(item=>item.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');const filter=button.dataset.filter;document.querySelectorAll('.art-card').forEach(card=>card.hidden=filter!=='all'&&card.dataset.category!==filter)}));
function refreshImageList(){activeImages=[...document.querySelectorAll('.art-card:not([hidden]) .photo-button')];}
function showImage(index){if(!activeImages.length)return;activeIndex=(index+activeImages.length)%activeImages.length;const button=activeImages[activeIndex];const image=button.querySelector('img');document.querySelector('#lightbox-image').src=image.src;document.querySelector('#lightbox-image').alt=image.alt;document.querySelector('#lightbox-caption').textContent=button.closest('.art-card').querySelector('.card-title').textContent;}
document.querySelectorAll('.photo-button').forEach(button=>button.addEventListener('click',()=>{refreshImageList();showImage(activeImages.indexOf(button));openModal(document.querySelector('#lightbox'))}));
document.querySelector('.lightbox-arrow.prev').addEventListener('click',()=>showImage(activeIndex-1));document.querySelector('.lightbox-arrow.next').addEventListener('click',()=>showImage(activeIndex+1));
const imageInput=document.querySelector('#post-image');
imageInput.addEventListener('change',()=>{const file=imageInput.files[0];if(!file)return;if(!file.type.startsWith('image/')){document.querySelector('#post-status').textContent='Please choose an image file.';return}if(selectedImageUrl)URL.revokeObjectURL(selectedImageUrl);selectedImageUrl=URL.createObjectURL(file);const preview=document.querySelector('#post-preview');preview.querySelector('img').src=selectedImageUrl;preview.style.display='block';document.querySelector('#post-status').textContent='';});
async function uploadToCloudinary(file){if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET)return selectedImageUrl;const formData=new FormData();formData.append('file',file);formData.append('upload_preset',CLOUDINARY_UPLOAD_PRESET);const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,{method:'POST',body:formData});if(!response.ok)throw new Error('Cloudinary could not accept this image. Check your cloud name and unsigned preset.');const result=await response.json();return result.secure_url;}
function addPostToGallery({title,caption,category,imageUrl,number}){const card=document.createElement('article');card.className='art-card';card.dataset.category=category;card.innerHTML=`<button class="photo-button" aria-label="Open photo: ${escapeHtml(title)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy"></button><div class="card-meta"><div><h3 class="card-title">${escapeHtml(title)}</h3><p class="card-caption">${escapeHtml(caption)}</p></div><time class="card-date">No. ${String(number).padStart(3,'0')}</time></div>`;gallery.prepend(card);card.querySelector('.photo-button').addEventListener('click',()=>{refreshImageList();showImage(activeImages.indexOf(card.querySelector('.photo-button')));openModal(document.querySelector('#lightbox'))});}
function renderQueue(){const list=document.querySelector('#queue-list');list.innerHTML=queuedPosts.length?'<div class="eyebrow">Waiting in the wings</div>':'';queuedPosts.forEach(post=>{const item=document.createElement('div');item.className='queue-item';item.innerHTML=`<span>${escapeHtml(post.title)}</span><small>${escapeHtml(post.when)}</small>`;list.append(item)})}
document.querySelector('#post-form').addEventListener('submit',async event=>{event.preventDefault();const status=document.querySelector('#post-status');const file=imageInput.files[0];if(!file){status.textContent='Choose a photo before adding your post.';return}const submit=document.querySelector('#post-submit');submit.disabled=true;status.textContent=CLOUDINARY_CLOUD_NAME?'Uploading your photo…':'Adding your photo to this tab…';try{const imageUrl=await uploadToCloudinary(file);const title=document.querySelector('#post-title').value.trim();const caption=document.querySelector('#post-caption').value.trim();const category=document.querySelector('#post-category').value;const dateValue=document.querySelector('#post-schedule').value;const post={title,caption,category,imageUrl,when:dateValue?new Date(dateValue).toLocaleString():'Queued for now'};if(dateValue&&new Date(dateValue)>new Date()){queuedPosts.push(post);renderQueue();status.textContent='Schedule added to this tab. Keep this page open; it will not auto-publish after you leave.'}else{addPostToGallery({...post,number:document.querySelectorAll('.art-card').length+1});status.textContent='Your moment is now in this gallery tab.'}event.target.reset();document.querySelector('#post-preview').style.display='none';if(selectedImageUrl){URL.revokeObjectURL(selectedImageUrl);selectedImageUrl=''}setTimeout(()=>{if(status.textContent.startsWith('Your moment'))closeModal(document.querySelector('#studio-modal'))},1000)}catch(error){status.textContent=error.message||'Something went wrong. Please try again.'}finally{submit.disabled=false}});
document.querySelector('#contact-form').addEventListener('submit',async event=>{event.preventDefault();const status=document.querySelector('#contact-status');if(!CONTACT_ENDPOINT){status.textContent='Not sent yet — add your Formspree or Basin endpoint in CONTACT_ENDPOINT to deliver this note.';return}const form=event.currentTarget;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;status.textContent='Sending your note…';try{const response=await fetch(CONTACT_ENDPOINT,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});if(!response.ok)throw new Error('The message service did not accept the note. Please try again.');form.reset();status.textContent='Your note is on its way. Thank you for writing!'}catch(error){status.textContent=error.message||'Could not send your note. Please try again.'}finally{submit.disabled=false}});
async function togglemusic() {
	var toggleBtn=document.getElementById('music-toggle');
	var labelSpan=toggleBtn.childNodes[1];
	if (!media.paused) {
		media.pause();
		toggleBtn.setAttribute('aria-pressed', 'false');
		toggleBtn.setAttribute('aria-label', 'Play gentle background music');
		labelSpan.textContent = 'Music off';
		return;
	}

	try {
		await media.play();
		toggleBtn.setAttribute('aria-pressed', 'true');
		toggleBtn.setAttribute('aria-label', 'Turn off gentle background music');
		labelSpan.textContent = 'Music on';
	} catch (err) {
		console.error('Audio playback failed:', err);
		labelSpan.textContent = 'Music unavailable';
	}
}
