
var canvas={getContext:function(){return{clearRect:function(){},save:function(){},restore:function(){},fillRect:function(){},beginPath:function(){},moveTo:function(){},lineTo:function(){},stroke:function(){},fill:function(){},fillText:function(){},arc:function(){},strokeRect:function(){},createRadialGradient:function(){return{addColorStop:function(){}}},createLinearGradient:function(){return{addColorStop:function(){}}}}},width:1,height:1};
var turnSpan={textContent:""};
var statusSpan={textContent:""};
var toastEl={textContent:"",classList:{add:function(){},remove:function(){}},_tm:null};
var CELL=56,OFFSET_X=28,OFFSET_Y=24,BD_W=504,BD_H=552;
var document={getElementById:function(){return{addEventListener:function(){},textContent:"",classList:{add:function(){},remove:function(){}}}},querySelectorAll:function(){return{forEach:function(){}}}};
var clearTimeout=function(){};
var performance={now:function(){return Date.now();}};
var setTimeout=function(fn,ms){fn();return 1;};

// ===================================================================
//  中国象棋引擎
//  特性: 迭代加深 + 时间限制搜索, Alpha-Beta 剪枝, 启发式走法排序
// ===================================================================

// 棋子类型
const GEN=0, ADVISOR=1, ELEPHANT=2, HORSE=3, CHARIOT=4, CANNON=5, SOLDIER=6;
const NAMES_B = ['将','士','象','马','车','炮','卒'];
const NAMES_R = ['帅','仕','相','馬','車','砲','兵'];
const RED=0, BLACK=1;
function opp(c){return c^1;}

class Board {
  constructor(){
    this.reset();
  }
  reset(){
    this.b = Array.from({length:10},()=>Array(9).fill(null));
    this.turn = RED;
    this.history = []; // {move, captured}
    this.setup();
  }
  setup(){
    const b = this.b;
    // 红方 (y=9 底线)
    const BR=[ {t:CHARIOT},{t:HORSE},{t:ELEPHANT},{t:ADVISOR},{t:GEN},{t:ADVISOR},{t:ELEPHANT},{t:HORSE},{t:CHARIOT} ];
    for(let x=0;x<9;x++) b[9][x]={...BR[x],c:RED};
    // 黑方 (y=0 底线)
    const BB=[ {t:CHARIOT},{t:HORSE},{t:ELEPHANT},{t:ADVISOR},{t:GEN},{t:ADVISOR},{t:ELEPHANT},{t:HORSE},{t:CHARIOT} ];
    for(let x=0;x<9;x++) b[0][x]={...BB[x],c:BLACK};
    // 炮
    b[7][1]=b[7][7]={t:CANNON,c:RED};
    b[2][1]=b[2][7]={t:CANNON,c:BLACK};
    // 兵/卒
    for(let x of [0,2,4,6,8]) b[6][x]={t:SOLDIER,c:RED};
    for(let x of [0,2,4,6,8]) b[3][x]={t:SOLDIER,c:BLACK};
  }

  // ========== 走法生成 ==========
  genRaw(x,y){
    const p = this.b[y][x];
    if(!p) return [];
    const {t:t,c:color}=p;
    const moves=[];
    const ok=(tx,ty)=>{
      if(tx<0||tx>8||ty<0||ty>9) return;
      const d=this.b[ty][tx];
      if(d && d.c===color) return;
      moves.push({fx:x,fy:y,tx,ty});
    };
    switch(t){
      case GEN:
        for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
          const nx=x+dx, ny=y+dy;
          if(ny<=(color?2:9) && ny>=(color?0:7) && nx>=3 && nx<=5) ok(nx,ny);
        }
        // 飞将
        const og = this.findGen(opp(color));
        if(og && og.x===x){
          let blocked=false;
          for(let yy=Math.min(y,og.y)+1; yy<Math.max(y,og.y); yy++){ if(this.b[yy][x]){blocked=true;break;} }
          if(!blocked) ok(og.x, og.y);
        }
        break;
      case ADVISOR:
        for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
          const nx=x+dx, ny=y+dy;
          if(ny<=(color?2:9) && ny>=(color?0:7) && nx>=3 && nx<=5) ok(nx,ny);
        }
        break;
      case ELEPHANT:
        for(const [dx,dy,ex,ey] of [[2,2,1,1],[2,-2,1,-1],[-2,2,-1,1],[-2,-2,-1,-1]]){
          const nx=x+dx, ny=y+dy, bx=x+ex, by=y+ey;
          if(nx<0||nx>8||ny<0||ny>9) continue;
          if(color===RED && ny<5) continue;
          if(color===BLACK && ny>4) continue;
          if(this.b[by][bx]) continue;
          ok(nx,ny);
        }
        break;
      case HORSE:
        for(const [dx,dy,bx,by] of [[1,2,0,1],[1,-2,0,-1],[-1,2,0,1],[-1,-2,0,-1],[2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0]]){
          const nx=x+dx, ny=y+dy, ex=x+bx, ey=y+by;
          if(nx<0||nx>8||ny<0||ny>9) continue;
          if(this.b[ey][ex]) continue;
          ok(nx,ny);
        }
        break;
      case CHARIOT:{
        for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
          let nx=x+dx, ny=y+dy;
          while(nx>=0&&nx<=8&&ny>=0&&ny<=9){
            const d=this.b[ny][nx];
            if(!d) ok(nx,ny);
            else{ if(d.c!==color) ok(nx,ny); break; }
            nx+=dx; ny+=dy;
          }
        }
        break;
      }
      case CANNON:{
        for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
          let nx=x+dx, ny=y+dy, screen=false;
          while(nx>=0&&nx<=8&&ny>=0&&ny<=9){
            const d=this.b[ny][nx];
            if(!screen){
              if(!d) ok(nx,ny);
              else screen=true;
            } else {
              if(d){ if(d.c!==color) ok(nx,ny); break; }
            }
            nx+=dx; ny+=dy;
          }
        }
        break;
      }
      case SOLDIER:
        if(color===RED){ ok(x,y-1); if(y<=4){ ok(x-1,y); ok(x+1,y); } }
        else { ok(x,y+1); if(y>=5){ ok(x-1,y); ok(x+1,y); } }
        break;
    }
    return moves;
  }

  // 所有合法走法（不走不回）
  allLegal(color){
    const list=[];
    for(let y=10;y--;) for(let x=9;x--;){
      const p=this.b[y][x];
      if(!p||p.c!==color) continue;
      for(const m of this.genRaw(x,y)){
        if(this.isLegal(m)) list.push(m);
      }
    }
    return list;
  }

  // 走法合法性: 走后不被将军
  isLegal(m){
    // 原地应用走法, 检查, 回退 (比 clone 快)
    const captured = this.b[m.ty][m.tx];
    this.b[m.ty][m.tx] = this.b[m.fy][m.fx];
    this.b[m.fy][m.fx] = null;
    const ok = !this.inCheck(this.turn);
    this.b[m.fy][m.fx] = this.b[m.ty][m.tx];
    this.b[m.ty][m.tx] = captured;
    return ok;
  }

  doMove(m){
    const captured = this.b[m.ty][m.tx];
    this.b[m.ty][m.tx] = this.b[m.fy][m.fx];
    this.b[m.fy][m.fx] = null;
    this.history.push({move:m, captured});
    this.turn = opp(this.turn);
    return captured;
  }

  undo(){
    const e=this.history.pop();
    if(!e) return null;
    const {move:m,captured:c}=e;
    this.b[m.fy][m.fx] = this.b[m.ty][m.tx];
    this.b[m.ty][m.tx] = c;
    this.turn = opp(this.turn);
    return e;
  }

  findGen(color){
    for(let y=10;y--;) for(let x=9;x--;){ const p=this.b[y][x]; if(p&&p.t===GEN&&p.c===color) return {x,y}; }
    return null;
  }

  // 是否被将军
  inCheck(color){
    const gen=this.findGen(color);
    if(!gen) return true;
    const oc=opp(color);
    for(let y=10;y--;) for(let x=9;x--;){
      const p=this.b[y][x];
      if(!p||p.c!==oc) continue;
      for(const m of this.genRaw(x,y)){
        if(m.tx===gen.x && m.ty===gen.y) return true;
      }
    }
    return false;
  }

  isMated(color){
    return this.allLegal(color).length===0;
  }

  // ========== 局面评估 ==========
  PIECE_VAL=[10000,300,300,500,1000,500,100];
  PST_R = {
    // [col][row] bonus for RED pieces, mirrored for BLACK
    // 将/帅
    0:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,2,4,2,0,0,0,0],[0,0,0,6,10,6,0,0,0,0] ],
    // 士/仕
    1:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,3,0,0,0,0,0],[0,0,0,4,0,4,0,0,0,0] ],
    // 象/相
    2:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0] ],
    // 马
    3:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,12,16,16,16,12,0,0,0],[0,0,8,12,16,12,8,0,0,0],[0,0,4,8,12,8,4,0,0,0],[0,0,0,4,8,4,0,0,0,0],[0,0,0,0,0,0,0,0,0,0] ],
    // 车
    4:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,2,4,6,8,6,4,2,0,0],[2,4,6,8,12,8,6,4,2,0],[4,6,8,12,16,12,8,6,4,0],[6,8,12,16,20,16,12,8,6,0] ],
    // 炮
    5:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,2,4,6,4,2,0,0,0],[0,2,4,6,8,6,4,2,0,0],[0,4,6,8,12,8,6,4,0,0],[0,2,4,6,8,6,4,2,0,0] ],
    // 兵/卒
    6:[ [0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,4,8,12,16,12,8,4,0,0],[0,2,4,6,8,6,4,2,0,0],[0,0,2,4,6,4,2,0,0,0],[8,6,4,2,0,2,4,6,8,0] ]
  };

  evaluate(){
    let score=0;
    const b=this.b;
    for(let y=10;y--;) for(let x=9;x--;){
      const p=b[y][x];
      if(!p) continue;
      const val=this.PIECE_VAL[p.t];
      const pos=this.PST_R[p.t]?.[x]?.[y]||0;
      if(p.c===RED) score+=val+pos;
      else score-=val+pos;
    }
    return score;
  }
}

// ========== AI 搜索 (迭代加深 + 时限) ==========

let aiTimeoutId=null;
let aiAborted=false;

function searchBest(board, timeLimitMs){
  const maxDepth=64;
  let bestMove=null;
  aiAborted=false;

  for(let depth=1; depth<=maxDepth; depth++){
    const start=performance.now();
    let result=null;
    let completed=false;

    // 尝试当前深度, 记录截止时间
    const deadline=start+timeLimitMs;

    function idSearch(d,alpha,beta,isMax){
      if(aiAborted) return 0; // 被中断
      if(d===0) return board.evaluate();
      const moves=board.allLegal(board.turn);
      if(moves.length===0) return isMax ? -99999 : 99999;

      // 走法排序: 吃子优先
      moves.sort((a,b)=>{
        const pa=board.b[a.ty][a.tx], pb=board.b[b.ty][b.tx];
        return (pb?board.PIECE_VAL[pb.t]:0) - (pa?board.PIECE_VAL[pa.t]:0);
      });

      // 检查超时
      if(performance.now()>=deadline){ aiAborted=true; return 0; }

      if(isMax){
        let best=-Infinity;
        for(const m of moves){
          if(aiAborted) return best;
          board.doMove(m);
          const val=idSearch(d-1,alpha,beta,false);
          board.undo();
          if(val>best) best=val;
          if(best>=beta) { alpha=beta; break; }
          if(best>alpha) alpha=best;
          if(performance.now()>=deadline){ aiAborted=true; return best; }
        }
        return best;
      } else {
        let best=Infinity;
        for(const m of moves){
          if(aiAborted) return best;
          board.doMove(m);
          const val=idSearch(d-1,alpha,beta,true);
          board.undo();
          if(val<best) best=val;
          if(best<=alpha) { beta=alpha; break; }
          if(best<beta) beta=best;
          if(performance.now()>=deadline){ aiAborted=true; return best; }
        }
        return best;
      }
    }

    // 根节点特殊处理（需返回走法而非估值）
    function rootSearch(isMax){
      const moves=board.allLegal(board.turn);
      if(moves.length===0) return null;
      moves.sort((a,b)=>{
        const pa=board.b[a.ty][a.tx], pb=board.b[b.ty][b.tx];
        return (pb?board.PIECE_VAL[pb.t]:0) - (pa?board.PIECE_VAL[pa.t]:0);
      });

      let best=moves[0];
      let bestVal, alpha=-Infinity, beta=Infinity;

      if(isMax){
        bestVal=-Infinity;
        for(const m of moves){
          if(aiAborted) return best;
          board.doMove(m);
          const val=idSearch(depth-1,alpha,beta,false);
          board.undo();
          if(val>bestVal){ bestVal=val; best=m; }
          if(val>alpha) alpha=val;
          if(alpha>=beta) break;
          if(performance.now()>=deadline){ aiAborted=true; return best; }
        }
      } else {
        bestVal=Infinity;
        for(const m of moves){
          if(aiAborted) return best;
          board.doMove(m);
          const val=idSearch(depth-1,alpha,beta,true);
          board.undo();
          if(val<bestVal){ bestVal=val; best=m; }
          if(val<beta) beta=val;
          if(beta<=alpha) break;
          if(performance.now()>=deadline){ aiAborted=true; return best; }
        }
      }
      return best;
    }

    result = rootSearch(board.turn===RED);
    if(aiAborted) break;
    if(result) bestMove=result;
    // 如果这一层超时了或者搜索结果等于最佳（不再改善），继续搜
    const elapsed=performance.now()-start;
    if(elapsed>timeLimitMs*0.9) break; // 已经接近时限
  }

  return bestMove || board.allLegal(board.turn)[0];
}


// ===================================================================
//  渲染 & UI
// ===================================================================

const ctx=canvas.getContext('2d');
canvas.width=BD_W; canvas.height=BD_H;

let board=new Board();
let sel=null;  // {x,y} or null
let valid=[];
let gameOver=false;
let aiBusy=false;
let aiTimeMs=5000;

function toPixel(c,r){ return {x:OFFSET_X+c*CELL, y:OFFSET_Y+r*CELL}; }

function toBoard(px,py){
  const c=Math.round((px-OFFSET_X)/CELL), r=Math.round((py-OFFSET_Y)/CELL);
  if(c<0||c>8||r<0||r>9) return null;
  const cp=toPixel(c,r);
  if(Math.hypot(px-cp.x,py-cp.y)>CELL*0.48) return null;
  return {x:c,y:r};
}

// ----- 棋盘绘制 -----
function draw(){
  ctx.clearRect(0,0,BD_W,BD_H);
  ctx.save();

  // 木纹底
  const grad=ctx.createLinearGradient(0,0,BD_W,BD_H);
  grad.addColorStop(0,'#f0c878'); grad.addColorStop(0.5,'#e8bc60'); grad.addColorStop(1,'#daa850');
  ctx.fillStyle=grad; ctx.fillRect(0,0,BD_W,BD_H);

  // 外框
  ctx.strokeStyle='#4a3520'; ctx.lineWidth=3;
  ctx.strokeRect(OFFSET_X-3,OFFSET_Y-3,CELL*8+6,CELL*9+6);

  ctx.strokeStyle='#4a3520'; ctx.lineWidth=1.2;
  // 横线
  for(let r=0;r<10;r++){
    const p0=toPixel(0,r),p8=toPixel(8,r);
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p8.x,p8.y);ctx.stroke();
  }
  // 竖线 (中空楚河汉界)
  for(let c=0;c<9;c++){
    if(c===0||c===8){
      const p0=toPixel(c,0), p9=toPixel(c,9);
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p9.x,p9.y);ctx.stroke();
    } else {
      const p0=toPixel(c,0), p4=toPixel(c,4), p5=toPixel(c,5), p9=toPixel(c,9);
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p4.x,p4.y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(p5.x,p5.y);ctx.lineTo(p9.x,p9.y);ctx.stroke();
    }
  }
  // 九宫斜线
  for(const [x1,y1,x2,y2] of [[3,0,5,2],[3,2,5,0],[3,7,5,9],[3,9,5,7]]){
    const p1=toPixel(x1,y1), p2=toPixel(x2,y2);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
  }
  // 楚河汉界
  ctx.fillStyle='#6b5030'; ctx.font='bold 18px "KaiTi","STKaiti",serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const ry=toPixel(0,4.5).y;
  ctx.fillText('楚  河', OFFSET_X+CELL*2, ry);
  ctx.fillText('漢  界', OFFSET_X+CELL*6, ry);
  // 十字花
  ctx.lineWidth=1;
  const stars=[[1,2],[1,7],[2,2],[2,7],[7,2],[7,7],[6,2],[6,7],[1,0],[1,9],[7,0],[7,9],[0,3],[0,6],[8,3],[8,6]];
  for(const [mx,my] of stars) drawStar(mx,my);

  // 选中高亮
  if(sel){
    const p=toPixel(sel.x,sel.y);
    ctx.fillStyle='rgba(255,215,0,0.35)';
    ctx.fillRect(p.x-CELL/2,p.y-CELL/2,CELL,CELL);
    ctx.strokeStyle='rgba(255,215,0,0.7)'; ctx.lineWidth=2.5;
    ctx.strokeRect(p.x-CELL/2,p.y-CELL/2,CELL,CELL);
  }
  // 合法走法
  for(const m of valid){
    const p=toPixel(m.tx,m.ty);
    if(board.b[m.ty][m.tx]){
      ctx.strokeStyle='rgba(255,60,60,0.55)'; ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(p.x,p.y,CELL*0.42,0,Math.PI*2);ctx.stroke();
    } else {
      ctx.fillStyle='rgba(0,220,80,0.3)';
      ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();
    }
  }
  // 上一步高亮
  if(board.history.length>0){
    const lm=board.history[board.history.length-1].move;
    for(const [lx,ly] of [[lm.fx,lm.fy],[lm.tx,lm.ty]]){
      const p=toPixel(lx,ly);
      ctx.fillStyle='rgba(80,180,255,0.15)';
      ctx.fillRect(p.x-CELL/2,p.y-CELL/2,CELL,CELL);
    }
  }

  // 棋子
  drawPieces();
  ctx.restore();
}

function drawStar(x,y){
  const p=toPixel(x,y); const len=6,gap=3,off=2;
  ctx.strokeStyle='#4a3520'; ctx.lineWidth=1;
  const segs=[
    [p.x-CELL/2+off,p.y-gap,p.x-CELL/2+off+len,p.y-gap],
    [p.x-CELL/2+off,p.y+gap,p.x-CELL/2+off+len,p.y+gap],
    [p.x+CELL/2-off,p.y-gap,p.x+CELL/2-off-len,p.y-gap],
    [p.x+CELL/2-off,p.y+gap,p.x+CELL/2-off-len,p.y+gap],
    [p.x-gap,p.y-CELL/2+off,p.x-gap,p.y-CELL/2+off+len],
    [p.x+gap,p.y-CELL/2+off,p.x+gap,p.y-CELL/2+off+len],
    [p.x-gap,p.y+CELL/2-off,p.x-gap,p.y+CELL/2-off-len],
    [p.x+gap,p.y+CELL/2-off,p.x+gap,p.y+CELL/2-off-len],
  ];
  for(const [sx,sy,ex,ey] of segs){
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
  }
}

function drawPieces(){
  for(let y=10;y--;) for(let x=9;x--;){
    const p=board.b[y][x];
    if(!p) continue;
    const pos=toPixel(x,y);
    const isRed=p.c===RED;
    const name=isRed?NAMES_R[p.t]:NAMES_B[p.t];

    // 阴影
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath();ctx.arc(pos.x+1.5,pos.y+2.5,CELL*0.42,0,Math.PI*2);ctx.fill();

    // 棋子底色
    const g=ctx.createRadialGradient(pos.x-5,pos.y-5,3,pos.x,pos.y,CELL*0.43);
    if(isRed){ g.addColorStop(0,'#ffe8d8'); g.addColorStop(.6,'#f0c8a8'); g.addColorStop(1,'#c89070'); }
    else { g.addColorStop(0,'#e8f0e8'); g.addColorStop(.6,'#c8d0c8'); g.addColorStop(1,'#90a090'); }
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(pos.x,pos.y,CELL*0.42,0,Math.PI*2);ctx.fill();

    // 边框
    ctx.strokeStyle=isRed?'#b04030':'#304050'; ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(pos.x,pos.y,CELL*0.42,0,Math.PI*2);ctx.stroke();

    // 内圈(将/士)
    if(p.t===GEN||p.t===ADVISOR){
      ctx.strokeStyle=isRed?'#b04030':'#304050'; ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(pos.x,pos.y,CELL*0.27,0,Math.PI*2);ctx.stroke();
    }

    // 文字
    ctx.fillStyle=isRed?'#c02010':'#182838';
    ctx.font='bold 21px "KaiTi","STKaiti","Noto Sans SC",serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(name,pos.x,pos.y+1);
  }
}


// ========== 游戏逻辑 ==========

function showToast(msg,time=2500){
  toastEl.textContent=msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._tm);
  toastEl._tm=setTimeout(()=>toastEl.classList.remove('show'),time);
}

function updateUI(){
  if(gameOver){
    const winner=board.turn===RED?'黑方':'红方';
    turnSpan.textContent='🏆 '+winner+'获胜！';
    statusSpan.textContent='点击"新局"重新开始';
    return;
  }
  if(aiBusy){
    turnSpan.textContent='🤔 AI思考中…';
    statusSpan.textContent='请稍候';
    return;
  }
  turnSpan.textContent=board.turn===RED?'🔴 红方走棋':'⚫ 黑方走棋';
  statusSpan.textContent=sel?'点击目标位置或其它棋子':'点击选中本方棋子';
}

function selectPiece(x,y){
  sel={x,y};
  valid=[];
  const raw=board.genRaw(x,y);
  for(const m of raw) if(board.isLegal(m)) valid.push(m);
  draw(); updateUI();
}

function onBoardClick(px,py){
  if(gameOver||aiBusy) return;
  const pos=toBoard(px,py);
  if(!pos) return;
  const clicked=board.b[pos.y][pos.x];

  if(sel){
    const move=valid.find(m=>m.tx===pos.x&&m.ty===pos.y);
    if(move){
      // 执行走法
      board.doMove(move);
      sel=null; valid=[];
      draw(); updateUI();
      checkState();
      return;
    }
    // 选自己的另一个子
    if(clicked&&clicked.c===board.turn){ selectPiece(pos.x,pos.y); return; }
    // 取消选择
    sel=null; valid=[]; draw(); updateUI();
    return;
  }

  if(clicked&&clicked.c===board.turn) selectPiece(pos.x,pos.y);
}

function checkState(){
  if(gameOver) return;
  if(board.isMated(board.turn)){
    gameOver=true; draw(); updateUI();
    const wn=board.turn===RED?'黑方':'红方';
    showToast('🏆 '+wn+'获胜！将杀！',4000);
    return;
  }
  if(board.inCheck(board.turn)) showToast('\u26a0\ufe0f 将军！');
  if(!gameOver && board.turn===BLACK) runAI();
}

function runAI(){
  aiBusy=true; updateUI();
  setTimeout(()=>{
    const m=searchBest(board, aiTimeMs);
    if(m && !gameOver){
      board.doMove(m);
      sel=null; valid=[]; draw(); aiBusy=false; updateUI();
      checkState();
    } else {
      aiBusy=false; updateUI();
    }
  },30);
}

function newGame(){
  board=new Board(); sel=null; valid=[]; gameOver=false; aiBusy=false;
  draw(); updateUI(); showToast('新局 · 红方先行',1500);
}

function undoMove(){
  if(gameOver||aiBusy||board.history.length===0) return;
  board.undo(); // AI 走法
  if(board.history.length>0) board.undo(); // 玩家走法
  sel=null; valid=[]; gameOver=false; draw(); updateUI();
}

function passTurn(){
  if(gameOver||aiBusy) return;
  // AI 为当前方(红方)走一步, 不触发对手 AI
  sel=null; valid=[]; draw(); updateUI();
  aiBusy=true; updateUI();
  setTimeout(()=>{
    const m=searchBest(board, aiTimeMs);
    if(m && !gameOver){
      board.doMove(m);
      draw();
    }
    aiBusy=false; updateUI();
    if(!gameOver && board.inCheck(board.turn)) showToast('\u26a0\ufe0f 将军！');
  },30);
}


// ========== 事件绑定 ==========

canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/rect.width, sy=canvas.height/rect.height;
  onBoardClick((e.clientX-rect.left)*sx, (e.clientY-rect.top)*sy);
});

document.getElementById('newBtn').addEventListener('click',newGame);
document.getElementById('undoBtn').addEventListener('click',undoMove);
document.getElementById('passBtn').addEventListener('click',passTurn);

document.querySelectorAll('.diff-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    aiTimeMs=parseInt(btn.dataset.time)*1000;
    showToast('难度切换: '+btn.textContent+' (AI思考'+btn.dataset.time+'秒)',2000);
  });
});


// ========== 启动 ==========
newGame();

try{
console.log('=== Board basic test ===');
var b=new Board();
console.log('Turn:',b.turn,'(0=RED)');
var rM=b.allLegal(RED);
console.log('RED legal moves:',rM.length);
if(rM.length) console.log("Sample:",JSON.stringify(rM.slice(0,3)));
console.log('BLACK legal moves:',b.allLegal(BLACK).length);
console.log('inCheck RED:',b.inCheck(RED),'BLACK:',b.inCheck(BLACK));
console.log('isMated RED:',b.isMated(RED),'BLACK:',b.isMated(BLACK));
console.log('Eval:',b.evaluate());
console.log('');console.log('--- Making move ---');
var m={fx:1,fy:7,tx:4,ty:7};
if(b.isLegal(m)){
b.doMove(m);console.log('Cannon move OK, turn:',b.turn);
console.log('BLACK moves:',b.allLegal(BLACK).length);
b.undo();console.log('Undone');
}else console.log('Cannon move ILLEGAL');
console.log('');console.log('=== AI Search ===');
var bb=new Board();
var start=Date.now();
var best=searchBest(bb,3000);
var elapsed=Date.now()-start;
console.log('searchBest:',best?JSON.stringify(best):'null','('+elapsed+'ms)');
if(best){
bb.doMove(best);console.log('After AI, turn:',bb.turn);
}else{
console.log('AI returned null!');
console.log('allLegal count:',bb.allLegal(bb.turn).length);
}
console.log('=== DONE ===');
}catch(e){
console.log('ERROR:',e.message);
console.log(e.stack);
}
