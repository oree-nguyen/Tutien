/** Non-blocking GPU timing. No readPixels, finish(), or waiting on an unfinished query. */
export class GpuFrameTimer{
 constructor(renderer){this.gl=renderer.getContext();this.ext=renderer.capabilities.isWebGL2?this.gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;this.free=[];this.pending=[];this.current=null;this.lastMs=0;this.samples=0;if(this.ext)for(let i=0;i<4;i++)this.free.push(this.gl.createQuery());}
 begin(){if(!this.ext||this.current||!this.free.length)return;this.current=this.free.pop();this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,this.current);}
 end(){if(!this.current)return;this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push(this.current);this.current=null;}
 poll(){if(!this.ext)return;const disjoint=this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);while(this.pending.length&&this.gl.getQueryParameter(this.pending[0],this.gl.QUERY_RESULT_AVAILABLE)){const query=this.pending.shift();if(!disjoint){const value=this.gl.getQueryParameter(query,this.gl.QUERY_RESULT)/1e6;if(Number.isFinite(value)&&value>0){this.lastMs=value;this.samples++;}}this.free.push(query);}}
 dispose(){if(this.current)this.end();for(const query of [...this.free,...this.pending])this.gl.deleteQuery(query);this.free.length=this.pending.length=0;}
}
