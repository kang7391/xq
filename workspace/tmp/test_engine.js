
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


var setTimeout = function(fn){ fn(); return 1; };
var clearTimeout = function(){};
var performance = { now: function(){ return Date.now(); } };

try {
  console.log("=== Board Test ===");
  var b = new Board();

  console.log("RED allLegal:", b.allLegal(RED).length);
  console.log("BLACK allLegal:", b.allLegal(BLACK).length);
  console.log("inCheck:", b.inCheck(RED), b.inCheck(BLACK));
  console.log("Eval:", b.evaluate());

  // Test specific opening moves
  var moves = [
    {fx:1,fy:7,tx:4,ty:7},  // cannon
    {fx:0,fy:9,tx:0,ty:8},  // chariot
    {fx:1,fy:9,tx:2,ty:7},  // horse
  ];
  for(var i=0;i<moves.length;i++){
    var m=moves[i];
    console.log("Move ("+m.fx+","+m.fy+")->("+m.tx+","+m.ty+") legal:", b.isLegal(m));
  }

  console.log("\n=== AI Search ===");
  var bb = new Board();
  var start = Date.now();
  var best = searchBest(bb, 3000);
  var elapsed = Date.now()-start;
  console.log("Result:", best ? JSON.stringify(best) : "null", elapsed+"ms");
  if(best) {
    bb.doMove(best);
    console.log("Turn after:", bb.turn);
  } else {
    var all = bb.allLegal(bb.turn);
    console.log("allLegal count:", all.length);
    if(all.length>0) console.log("First:", JSON.stringify(all[0]), "isLegal:", bb.isLegal(all[0]));
    for(var y=0;y<10;y++) for(var x=0;x<9;x++) {
      var p = bb.b[y][x];
      if(p && p.c===bb.turn) {
        var raw = bb.genRaw(x,y);
        if(raw.length > 0) {
          var leg = bb.isLegal(raw[0]);
          console.log("  ("+x+","+y+") type:"+p.t+" raw:"+raw.length+" leg:"+leg);
        }
      }
    }
  }
  console.log("\n=== DONE ===");
} catch(e) {
  console.log("ERROR:", e.message);
  console.log(e.stack);
}
