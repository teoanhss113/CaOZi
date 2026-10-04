// Read-only pixel analysis: measure the transparent opening of each frame.
const { PNG } = require('pngjs');
const fs = require('fs');
const result = {};
function measure(p,x0,y0,w,h,name){
 const stack=[[Math.round(w/2),Math.round(h/2)]],seen=new Set(),pts=[];
 while(stack.length){const [x,y]=stack.pop(),k=y*w+x;
  if(x<0||y<0||x>=w||y>=h||seen.has(k))continue;
  seen.add(k);if(p.data[((y+y0)*p.width+x+x0)*4+3]>80)continue;
  pts.push([x,y]);stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
 }
 const xs=pts.map(p=>p[0]).sort((a,b)=>a-b),ys=pts.map(p=>p[1]).sort((a,b)=>a-b);
 const q=(a,v)=>a[Math.floor(a.length*v)];
 const cx=(q(xs,.01)+q(xs,.99))/2,cy=(q(ys,.01)+q(ys,.99))/2;
 const distances=pts.map(([x,y])=>Math.hypot(x-cx,y-cy)).sort((a,b)=>a-b);
 result[name]={x:cx/w,y:cy/w,diameter:(q(distances,.998)*2+4)/w};
}
const sheet=PNG.sync.read(fs.readFileSync('assets/avatar-frames/zodiac-sheet.png'));
const names=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
names.forEach((name,i)=>measure(sheet,i%3*362,[0,344,687,1028][Math.floor(i/3)],362,344,name));
for(const n of ['king','air','water','fire','earth']){const p=PNG.sync.read(fs.readFileSync('assets/avatar-frames/'+(n==='king'?'king-v2':n)+'.png'));measure(p,0,0,p.width,p.height,n);}
fs.writeFileSync('constants/avatarApertures.json',JSON.stringify(result,null,2)+'\n');
