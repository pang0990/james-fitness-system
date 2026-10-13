"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

type RainParticle = {
  x: number; y: number; length: number; speed: number;
  opacity: number; thickness: number; foreground: boolean;
};
type AirVehicle = {
  x: number; y: number; speed: number; scale: number;
  hue: "amber" | "cyan" | "rose"; route: number; seed: number;
};
type Haze = { x: number; y: number; radius: number; opacity: number; speed: number; seed: number };
type BuildingLight = { x: number; y: number; w: number; h: number; hue: string; phase: number; edge: boolean };

const RAND_SEED = 20771;
/** Deterministic randomness prevents the skyline from reshuffling after resizing. */
function seeded(seed = RAND_SEED) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
const clamp = (n:number, min:number, max:number) => Math.min(max,Math.max(min,n));
const wrap = (v:number, range:number) => (v % range + range) % range;

function glow(
  ctx: CanvasRenderingContext2D, x:number, y:number, radius:number,
  color:string, alpha:number,
) {
  const g = ctx.createRadialGradient(x,y,0,x,y,radius);
  g.addColorStop(0,color);
  g.addColorStop(0.23,color);
  g.addColorStop(1,"transparent");
  ctx.globalAlpha=alpha;
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.ellipse(x,y,radius,radius*.62,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;
}

/**
 * Real-time 2.5D city atmosphere drawn over the existing photographic concept art.
 * It provides independent moving air traffic, architectural signage, rain, fog,
 * reflective light and subtle parallax, but does not pretend the art is a 3D GLB.
 * Everything is decorative and cannot intercept Hero actions.
 */
export function CityAtmosphere() {
  const ref=useRef<HTMLCanvasElement>(null);
  const {state}=useStore();
  const enabled=state.preferences?.cityAnimation!==false &&
    state.preferences?.reduceMotion!==true;

  useEffect(()=>{
    const canvas=ref.current;
    if(!canvas || !enabled) return;
    const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
    if(!ctx) return;

    const systemMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const dataSaver=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData===true;
    if(dataSaver) return; // Respect data saver without loading animated layers.

    const rand=seeded();
    const rain:RainParticle[]=Array.from({length:125},()=>({
      x:rand(),y:rand(),length:8+rand()*26,speed:0.15+rand()*.40,
      opacity:0.06+rand()*.21,thickness:rand()>.84?1.2:.7,
      foreground:rand()>.73,
    }));
    const vehicles:AirVehicle[]=Array.from({length:7},(_,index)=>({
      x:rand(),y:.14+rand()*.37,speed:.007+rand()*.025,
      scale:.3+rand()*.9,
      hue:index%3===0?"amber":index%3===1?"cyan":"rose",
      route:index%2?1:-1,seed:rand()*Math.PI*2,
    }));
    const haze:Haze[]=Array.from({length:7},()=>({
      x:rand()*1.5-.2,y:.2+rand()*.65,radius:.18+rand()*.3,
      opacity:.018+rand()*.033,speed:.0018+rand()*.002,seed:rand()*6.28,
    }));
    const windows:BuildingLight[]=Array.from({length:85},()=>{
      const edge=rand()>.5;
      return {x:edge ? .77+rand()*.23 : rand()*.23,y:.08+rand()*.61,
        w:1+rand()*3.2,h:1.5+rand()*6,
        hue:rand()>.62?"#75b8c7":rand()>.5?"#bd74ae":"#f5a768",
        phase:rand()*6.28,edge,
      };
    });
    const signs=[
      {x:.075,y:.31,width:.048,height:.115,color:"#e373ab",name:"JFS"},
      {x:.862,y:.40,width:.044,height:.087,color:"#9dbdcf",name:"NOVA"},
      {x:.135,y:.51,width:.032,height:.081,color:"#c17bc2",name:"07"},
      {x:.904,y:.245,width:.036,height:.103,color:"#e0b574",name:"X"},
    ];

    let width=1,height=1,dpr=1;
    let last=0,elapsed=0;
    let frame=0;
    let active=false,intersecting=false;
    let pointer={x:0,y:0},target={x:0,y:0};
    const narrow=window.matchMedia("(max-width: 560px)").matches;
    const fewCores=(navigator.hardwareConcurrency??8)<=4;
    const interval=1000/(narrow||fewCores?24:30);

    const resize=()=>{
      const bounds=canvas.getBoundingClientRect();
      width=Math.max(1,bounds.width);
      height=Math.max(1,bounds.height);
      dpr=Math.min(window.devicePixelRatio||1,narrow?1.4:1.75);
      canvas.width=Math.max(1,Math.round(width*dpr));
      canvas.height=Math.max(1,Math.round(height*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };

    function draw(time:number,dt:number){
      ctx!.setTransform(dpr,0,0,dpr,0,0);
      ctx!.clearRect(0,0,width,height);
      pointer.x+=(target.x-pointer.x)*clamp(dt*1.7,0,1);
      pointer.y+=(target.y-pointer.y)*clamp(dt*1.7,0,1);

      // Architectural reflections: anchored to the distant edge buildings,
      // with different parallax depth from the near-field rain.
      ctx!.save();
      ctx!.globalCompositeOperation="screen";
      windows.forEach((light,i)=>{
        const pulse=.58+.42*Math.sin(time*(i%9===0?2.4:.52)+light.phase);
        ctx!.fillStyle=light.hue;
        ctx!.globalAlpha=(i%8===0?.27:.09)*pulse;
        ctx!.fillRect(light.x*width+pointer.x*(light.edge?4:7),
          light.y*height+pointer.y*3,light.w*(width/460),light.h*(height/850));
      });
      ctx!.globalAlpha=1;

      // Signage: recessed neon with gentle, non-strobe voltage fluctuations.
      for(const sign of signs){
        const x=sign.x*width+pointer.x*6,y=sign.y*height+pointer.y*4;
        const sw=sign.width*width,sh=sign.height*height;
        const flicker=.6+.4*Math.sin(time*.68+sign.x*8);
        glow(ctx!,x+sw/2,y+sh/2,sw*2,sign.color,.08*flicker);
        ctx!.globalAlpha=.42*flicker;
        ctx!.strokeStyle=sign.color;
        ctx!.lineWidth=clamp(width*.003,1,1.5);
        ctx!.strokeRect(x,y,sw,sh);
        ctx!.globalAlpha=.19*flicker;
        ctx!.fillStyle=sign.color;
        ctx!.fillRect(x+sw*.12,y+sh*.1,sw*.76,sh*.8);
        ctx!.save();
        ctx!.translate(x+sw*.56,y+sh*.80);
        ctx!.rotate(-Math.PI/2);
        ctx!.fillStyle="#f6e1dc";
        ctx!.font=`${Math.max(7,width*.017)}px sans-serif`;
        ctx!.textAlign="center";
        ctx!.globalAlpha=.56*flicker;
        ctx!.fillText(sign.name,sh*.26,0);
        ctx!.restore();
        ctx!.globalAlpha=1;
      }

      // Air traffic follows shallow diagonal lanes at different apparent depths.
      for(const vehicle of vehicles){
        vehicle.x=wrap(vehicle.x+vehicle.speed*dt,1.36);
        const t=vehicle.route===1?vehicle.x:1.25-vehicle.x;
        const x=(t-.13)*width+pointer.x*(5+vehicle.scale*4);
        const y=(vehicle.y + Math.sin(time*.25+vehicle.seed)*.006 + t*.027)*height;
        if(x < -60 || x>width+60) continue;
        const size=clamp(width/420,0.55,1.6)*vehicle.scale;
        const color=vehicle.hue==="amber"?"#ffd293":vehicle.hue==="cyan"?"#9bdff1":"#f2a3ce";
        glow(ctx!,x,y,26*size,color,.14);
        ctx!.strokeStyle=color;ctx!.lineWidth=Math.max(.7,size*.6);
        ctx!.globalAlpha=.29;ctx!.beginPath();
        ctx!.moveTo(x-(vehicle.route===1?1:-1)*44*size,y+size*.6);
        ctx!.lineTo(x,y);ctx!.stroke();
        ctx!.globalAlpha=.58;
        ctx!.fillStyle="#111620";
        ctx!.beginPath();
        ctx!.moveTo(x-12*size,y+2*size);
        ctx!.lineTo(x-5*size,y-3*size);
        ctx!.lineTo(x+7*size,y-3*size);
        ctx!.lineTo(x+12*size,y+2*size);
        ctx!.closePath();ctx!.fill();
        ctx!.fillStyle=color;
        ctx!.fillRect(x-10*size,y+1*size,3*size,1.6*size);
        ctx!.fillRect(x+7*size,y+1*size,3*size,1.6*size);
        ctx!.fillStyle="#d2e3fa";ctx!.globalAlpha=.4;
        ctx!.fillRect(x-3*size,y-2*size,6*size,1.3*size);
        ctx!.globalAlpha=1;
      }

      // Slow fog bands occupy different planes and never obscure the action queue.
      for(const cloud of haze){
        const cx=(wrap(cloud.x+time*cloud.speed,1.65)-.3)*width;
        const cy=cloud.y*height+Math.sin(time*.15+cloud.seed)*height*.018;
        const radius=cloud.radius*width;
        const g=ctx!.createRadialGradient(cx,cy,0,cx,cy,radius);
        g.addColorStop(0,cloud.seed>3?"rgba(94,137,160,.22)":"rgba(171,120,123,.16)");
        g.addColorStop(.42,"rgba(91,107,133,.08)");
        g.addColorStop(1,"rgba(29,37,49,0)");
        ctx!.globalAlpha=cloud.opacity*4;
        ctx!.fillStyle=g;
        ctx!.beginPath();
        ctx!.ellipse(cx,cy,radius,radius*.45,0,0,Math.PI*2);
        ctx!.fill();
      }
      ctx!.globalAlpha=1;
      ctx!.restore();

      // Two rain depths: the near streaks move faster and respond more to the view.
      ctx!.save();
      ctx!.lineCap="round";
      for(const drop of rain){
        drop.y+=drop.speed*dt;
        drop.x+=dt*(drop.foreground?.035:.015);
        if(drop.y>1.07){drop.y=-.06;drop.x=rand();}
        if(drop.x>1.05)drop.x=-.04;
        const x=drop.x*width+pointer.x*(drop.foreground?9:3);
        const y=drop.y*height;
        const len=drop.length*(height/850)*(drop.foreground?1.4:.7);
        // Warm/cool sign reflections cause subtle tint, not pure-white static noise.
        ctx!.strokeStyle=drop.x>.7?"#b2cfe6":drop.x<.27?"#b8aed1":"#bdc8d2";
        ctx!.globalAlpha=drop.opacity*(drop.foreground?.95:.55);
        ctx!.lineWidth=drop.thickness;
        ctx!.beginPath();
        ctx!.moveTo(x,y);ctx!.lineTo(x-3.5*(len/30),y+len);ctx!.stroke();
      }
      ctx!.restore();

      // A restrained wash of moving street reflections under the visual subject.
      ctx!.save();
      ctx!.globalCompositeOperation="screen";
      for(let i=0;i<11;i++){
        const lane=i/11;
        const flicker=.35+.32*Math.sin(time*.9+i*2.5);
        const x=(.06+lane*.91)*width+pointer.x*2;
        const y=(.77+lane*.15)*height;
        ctx!.fillStyle=i%3===0?"#e1b27d":"#89b5d4";
        ctx!.globalAlpha=.045*flicker;
        ctx!.fillRect(x,y,clamp(6+lane*21,6,38),1);
        ctx!.fillRect(x+2,y+6,clamp(15+lane*25,15,45),.75);
      }
      ctx!.restore();
    }

    const tick=(now:number)=>{
      if(!active)return;
      frame=window.requestAnimationFrame(tick);
      if(now-last<interval)return;
      const dt=Math.min((now-last)/1000||0,.08);
      last=now;
      elapsed+=dt;
      draw(elapsed,dt);
    };
    const update=()=>{
      const play=intersecting && !document.hidden && !systemMotion.matches;
      if(play===active)return;
      active=play;
      if(play){last=performance.now();frame=requestAnimationFrame(tick);}
      else {cancelAnimationFrame(frame);frame=0;}
    };
    const observer=new IntersectionObserver(entries=>{
      intersecting=entries[0]?.isIntersecting===true;update();
    },{threshold:.05});
    const move=(event:PointerEvent)=>{
      const box=canvas.getBoundingClientRect();
      target.x=clamp((event.clientX-box.left)/box.width*2-1,-1,1);
      target.y=clamp((event.clientY-box.top)/box.height*2-1,-1,1);
    };
    const resetPointer=()=>{target={x:0,y:0};};
    const resizeObserver=new ResizeObserver(resize);
    resize();
    resizeObserver.observe(canvas);
    observer.observe(canvas);
    window.addEventListener("pointermove",move,{passive:true});
    window.addEventListener("pointerout",resetPointer,{passive:true});
    document.addEventListener("visibilitychange",update);
    systemMotion.addEventListener("change",update);
    return ()=>{
      active=false;cancelAnimationFrame(frame);
      observer.disconnect();resizeObserver.disconnect();
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerout",resetPointer);
      document.removeEventListener("visibilitychange",update);
      systemMotion.removeEventListener("change",update);
    };
  },[enabled]);

  return <canvas ref={ref} className="jfs-city-atmosphere" aria-hidden="true" />;
}
