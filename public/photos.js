export async function readPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024) throw Error('Choose a JPG, PNG or WebP under 12 MB.');
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,900/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.75);
  } finally {URL.revokeObjectURL(url);}
}
