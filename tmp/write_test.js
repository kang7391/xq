const fs=require('fs');
const html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const stubs=`
// ===== stubs =====
const canvas={getContext(){return{clearRect(){},save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},strokeRect(){},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}}}},width:1,height:1};
let turnSpan={textContent:''};
let statusSpan={textContent:''};
let toastEl={textContent:'',classList:{add(){},remove(){}},_tm:null};
let BD_W=504,BD_H=552,CELL=56,OFFSET_X=28,OFFSET_Y=24;
const document={getElementById(){return{addEventListener(){},textContent:'',classList:{add(){},remove(){}}}},querySelectorAll(){return{forEach(){}}}};
// capture setTimeout calls for synchronous test
let gTimers=[];
const setTimeout=(fn,ms)=>{gTimers.push({fn,ms});return gTimers.length;};
const clearTimeout=(id)=>{};
`;

const fullCode=stubs+js+`

// ===== Test =====
try{
  console.log("=== Board basic test ===");
  const b=new Board();
  console.log("Turn:",b.turn,"(0=RED)");
  var rMoves=b.allLegal(RED);
  console.log("RED legal moves:",rMoves.length);
  if(rMoves.length>0) console.log("Sample:",JSON.stringify(rMoves.slice(0,3)));
  console.log("BLACK legal moves:",b.allLegal(BLACK).length);
  console.log("inCheck RED:",b.inCheck(RED),"BLACK:",b.inCheck(BLACK));
  console.log("isMated RED:",b.isMated(RED),"BLACK:",b.isMated(BLACK));
  console.log("Eval:",b.evaluate());

  // Do a move
  if(rMoves.length){
    b.doMove(rMoves[0]);
    console.log("\\nAfter RED move, turn:",b.turn);
    var bMoves=b.allLegal(BLACK);
    console.log("BLACK legal moves:",bMoves.length);
    b.undo();
    console.log("After undo, turn:",b.turn);
  }

  // Gen raw tests
  const rawChariot=new Board().genRaw(0,9);
  console.log("\\nChariot(0,9) raw moves:",rawChariot.length);
  const rawHorse=new Board().genRaw(1,9);
  console.log("Horse(1,9) raw moves:",rawHorse.length);
  const rawCannon=new Board().genRaw(1,7);
  console.log("Cannon(1,7) raw moves:",rawCannon.length);

  // ===== AI search test =====
  console.log("\\n=== AI search test ===");
  const b2=new Board();
  gTimers=[];
  // Direct call to searchBest without setTimeout
  console.log("Board turn before AI:",b2.turn);
  const searchStart=Date.now();
  const best=searchBest(b2,2000);
  const searchTime=Date.now()-searchStart;
  console.log("AI result:",best?JSON.stringify(best):"null","("+searchTime+"ms)");
  
  if(!best){
    // Try allLegal directly
    const moves=b2.allLegal(BLACK);
    console.log("BLACK allLegal:",moves.length,moves.length>0?JSON.stringify(moves[0]):"");
    console.log("FAIL - AI returned null!");
  } else {
    b2.doMove(best);
    console.log("After AI move, turn:",b2.turn);
    console.log("SUCCESS - AI works!");
  }

  console.log("\\n=== DONE ===");
}catch(e){
  console.log("ERROR:",e.message);
  console.log(e.stack);
}
`;

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', fullCode);
console.log('Written');
