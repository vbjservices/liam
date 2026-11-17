/** Camera interpolation used by the StairMaster and mountain journey. */
export function createCameraSampler(keypoints,{clamp,smooth,mix,lastGymKey=6,flowing=true}) {
  const cubicSmoothSegment=(a,b,ta,tb,u)=>{
    const u2=u*u,u3=u2*u;
    return (2*u3-3*u2+1)*a+(u3-2*u2+u)*ta+(-2*u3+3*u2)*b+(u3-u2)*tb;
  };
  const gymCurveComponent=(i,k,field,u)=>{
    const a=keypoints[i-1],b=keypoints[i],dt=b.t-a.t;
    function slope(idx){
      if(idx===0||idx===lastGymKey)return 0;
      const before=keypoints[idx-1],after=keypoints[idx+1];
      return .92*(after[field][k]-before[field][k])/(after.t-before.t);
    }
    return cubicSmoothSegment(a[field][k],b[field][k],slope(i-1)*dt,slope(i)*dt,u);
  };
  return function sample(t){
    let i=keypoints.findIndex(p=>p.t>=t);if(i<1)i=1;
    const a=keypoints[i-1],b=keypoints[i],v=smooth(a.t,b.t,t);
    if(flowing && t>=0 && t<=keypoints[lastGymKey].t && i<=lastGymKey){
      const u=clamp((t-a.t)/(b.t-a.t),0,1);
      return{pos:a.pos.map((_,k)=>gymCurveComponent(i,k,'pos',u)),
             look:a.look.map((_,k)=>gymCurveComponent(i,k,'look',u)),
             fov:mix(a.fov,b.fov,v)};
    }
    return{pos:a.pos.map((n,k)=>mix(n,b.pos[k],v)),
           look:a.look.map((n,k)=>mix(n,b.look[k],v)),
           fov:mix(a.fov,b.fov,v)};
  };
}
