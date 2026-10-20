export const VERSION = 1;
export const roads = [[0,1],[0,2],[1,3],[2,3],[2,4],[3,5],[4,5],[5,6],[4,7],[6,7]];
export const people = [
 ['hejin','하진',0,'군주',[76,69,60,70,78],82,64],
 ['caocao','조조',0,'장수',[96,72,94,91,96],94,67],
 ['liubei','유비',0,'장수',[83,78,75,79,99],63,97],
 ['luzhi','노식',0,'장수',[90,55,89,86,88],42,94],
 ['zhangjue','장각',1,'군주',[86,35,91,80,95],87,72],
 ['zhangbao','장보',1,'장수',[74,71,78,60,70],74,74],
 ['zhangliang','장량',1,'장수',[78,80,62,54,68],73,75],
 ['guan','관우',0,'장수',[92,97,75,62,90],68,99]
];
export const factions = ['후한 토벌군','황건군'];
export function createGame(player='liubei') {
 if(!people.some(p=>p[0]===player)) throw Error('선택할 수 없는 인물');
 const cities=[['낙양',0,90,235,10000],['업',0,195,84,7000],['허창',0,204,270,6500],['거록',1,296,124,10000],['완',1,112,376,5500],['복양',1,316,268,6000],['북해',0,399,303,6000],['양양',0,258,443,5000]].map((c,id)=>({id,name:c[0],faction:c[1],x:c[2],y:c[3],troops:c[4],gold:3000,food:18000,farm:45,training:45,morale:70,order:'균형',task:null}));
 return {version:VERSION,day:0,seed:184,player,people:people.map(p=>({id:p[0],name:p[1],faction:p[2],role:p[3],stats:p[4],ambition:p[5],loyalty:p[6],alive:true,merit:0,relations:{},extensions:{}})),cities,armies:[],logs:[{day:0,text:'184년 황건의 난. 지방에서 봉기가 확산되고 조정이 토벌에 나섰습니다.'}],pending:null,nextArmy:1,extensions:{family:null},scenario:'184-prototype'};
}
export const actor=s=>s.people.find(p=>p.id===s.player);
export const owned=(s,c)=>s.cities[c]?.faction===actor(s).faction;
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function log(s,text){s.logs.unshift({day:s.day,text});s.logs=s.logs.slice(0,100);}
export function available(s){return s.people.filter(p=>p.alive&&p.id!==s.player);}
export function order(s,id,type){
 const c=s.cities[id],p=actor(s);
 if(s.pending)throw Error('먼저 진행 중인 사건을 결정하세요.');
 if(!c||!owned(s,id))throw Error('소속 세력의 도시를 선택하세요.');
 if(c.task)throw Error('이미 명령을 수행하고 있습니다.');
 const tasks={개발:{days:5,cost:250},훈련:{days:3,cost:180},징병:{days:4,cost:500},군량:{days:3,cost:250}};
 const t=tasks[type];if(!t)throw Error('알 수 없는 명령');
 if(c.gold<t.cost)throw Error('자금이 부족합니다.');
 c.gold-=t.cost;c.task={type,left:t.days,by:p.id};log(s,`${c.name}: ${type} ${p.role==='장수'?'건의가 승인되어 ':''}착수했습니다. (${t.days}일)`);
}
export function setPolicy(s,id,policy){if(!owned(s,id))throw Error('소속 도시만 위임할 수 있습니다.');if(!['균형','농업','군비'].includes(policy))throw Error('잘못된 방침');if(actor(s).role==='장수')throw Error('도시 위임은 태수·군주의 권한입니다.');s.cities[id].order=policy;log(s,`${s.cities[id].name}에 ${policy} 방침을 전달했습니다.`);}
export function interact(s,id){
 if(s.pending)throw Error('먼저 사건을 결정하세요.');
 const p=actor(s),q=s.people.find(p=>p.id===id);
 if(!q?.alive||q.id===p.id)throw Error('교류할 수 없는 인물');
 if(q.faction!==p.faction)throw Error('현재는 같은 세력 인물과 교류할 수 있습니다.');
 if(p.lastTalk===s.day)throw Error('오늘은 이미 교류했습니다. 하루를 진행하세요.');
 p.lastTalk=s.day;p.relations[id]=Math.min(100,(p.relations[id]||0)+8);q.relations[p.id]=p.relations[id];p.merit+=2;
 log(s,`${q.name}와 군정에 관해 이야기했습니다. 상호 친밀도 ${p.relations[id]}.`);
}
export function march(s,from,to,count=2000,tactic='신중',unit='보병'){
 if(s.pending)throw Error('먼저 사건을 결정하세요.');
 const p=actor(s),a=s.cities[from],b=s.cities[to];
 if(!a||!b||!owned(s,from)||a.faction===b.faction)throw Error('아군 도시에서 적 도시로 출진하세요.');
 if(!roads.some(r=>r.includes(from)&&r.includes(to)))throw Error('연결된 도시로만 출진할 수 있습니다.');
 if(!['신중','강습','포위'].includes(tactic)||!['보병','기병','궁병'].includes(unit))throw Error('잘못된 편성');
 if(!Number.isInteger(count)||count<1000||count>a.troops-1000)throw Error('출진 1,000명 이상, 수비병 1,000명 이상이 필요합니다.');
 const food=Math.ceil(count*.7);if(a.food<food)throw Error('원정 군량이 부족합니다.');
 if(s.armies.some(a=>a.leader===p.id))throw Error('지휘 중인 부대가 귀환한 뒤 출진하세요.');
 a.troops-=count;a.food-=food;
 const duration=Math.max(2,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/(unit==='기병'?65:45)))+(tactic==='포위'?2:0);
 s.armies.push({id:s.nextArmy++,from,to,faction:p.faction,troops:count,food,days:duration,total:duration,tactic,unit,training:a.training,morale:a.morale,leader:p.id});
 log(s,`${p.name}: ${a.name} → ${b.name}, ${unit} ${count.toLocaleString()}명 출진. 도착까지 ${duration}일.`);
}
function battle(s,a){
 const c=s.cities[a.to],p=s.people.find(p=>p.id===a.leader),supplied=s.cities[a.from].faction===a.faction;
 if(c.faction===a.faction){c.troops+=a.troops;log(s,`${c.name}에 증원군이 합류했습니다.`);return;}
 const terrain=(c.id===3||c.id===4)?'험지':'평지';
 const unitFactor=a.unit==='기병'?(terrain==='평지'?1.17:.82):a.unit==='궁병'?1.06:1;
 const tactic=a.tactic==='강습'?1.14:a.tactic==='포위'?1.22:1;
 const attack=a.troops*(.6+p.stats[0]/100)*(1+a.training/140)*(a.morale/70)*unitFactor*tactic*(supplied?1:.65)*(.9+rand(s)*.2);
 const defense=c.troops*1.35*(1+c.training/160)*(c.morale/70)*(terrain==='험지'?1.15:1);
 const win=attack>defense,loss=win?.25:a.tactic==='강습'?.6:.4,survivors=Math.floor(a.troops*(1-loss));
 if(win){c.faction=a.faction;c.troops=survivors;c.morale=55;p.merit+=40;}
 else{c.troops=Math.max(300,Math.floor(c.troops*.77));const home=s.cities[a.from].faction===a.faction?s.cities[a.from]:s.cities.find(c=>c.faction===a.faction);if(home)home.troops+=survivors;p.merit+=5;}
 const text=`${c.name} ${win?'함락':'공략 실패'}. 아군 ${a.troops-survivors}명 손실. ${terrain} · ${a.unit} · 훈련 ${a.training} · ${a.tactic} · 보급 ${supplied?'유지':'단절'}. 전력비 ${(attack/defense).toFixed(2)}.`;
 s.pending={kind:'report',title:win?'승전 보고':'퇴각 보고',text};log(s,text);
}
function tick(s){
 s.day++;
 for(const c of s.cities){
 c.gold+=8+Math.floor(c.farm/10);c.food=Math.max(0,c.food+Math.floor(c.farm*2)-Math.ceil(c.troops*.006));
 if(c.food===0){c.morale=Math.max(10,c.morale-2);c.troops=Math.max(0,c.troops-20);}
 if(c.task&&--c.task.left<=0){const t=c.task;const p=s.people.find(p=>p.id===t.by);if(t.type==='개발')c.farm=Math.min(100,c.farm+8);if(t.type==='훈련')c.training=Math.min(100,c.training+8);if(t.type==='징병')c.troops+=1000;if(t.type==='군량')c.food+=3500;if(p?.alive)p.merit+=8;log(s,`${c.name}: ${t.type} 완료.`);c.task=null;}
 if(s.day%7===0){if(c.order==='농업'&&c.gold>=80){c.gold-=80;c.farm=Math.min(100,c.farm+2);}if(c.order==='군비'&&c.gold>=100){c.gold-=100;c.troops+=200;c.training=Math.min(100,c.training+1);}if(c.faction!==actor(s).faction){c.troops+=120;c.training=Math.min(100,c.training+1);}}
 }
 // Resolve due armies one at a time; unprocessed arrivals remain at zero days until next day.
 for(const a of s.armies)a.days=Math.max(0,a.days-1);
 const due=s.armies.find(a=>a.days===0);if(due){s.armies=s.armies.filter(a=>a.id!==due.id);battle(s,due);}
 if(!s.pending&&s.day%9===0){
 const enemy=s.cities.find(c=>c.faction!==actor(s).faction&&c.troops>3500);
 const target=enemy&&s.cities.find(c=>c.faction===actor(s).faction&&roads.some(r=>r.includes(c.id)&&r.includes(enemy.id)));
 if(target){const n=800;enemy.troops-=n;const loss=Math.min(target.troops,Math.floor(n*(.25+rand(s)*.35)));target.troops-=loss;log(s,`${enemy.name}守軍의 습격: ${target.name} 수비병 ${loss}명 손실. 적 ${n}명은 원정 후 ${n-300}명 귀환.`.replace('守軍',' 수비군'));enemy.troops+=n-300;s.pending={kind:'report',title:'변경의 급보',text:`${target.name} 인근에 적이 출몰했습니다. 수비병 ${loss}명을 잃었습니다. 훈련·징병과 주변 도시의 병력을 확인하세요.`};}
 }
 const p=actor(s);if(!s.pending&&p.role==='장수'&&p.merit>=30&&!p.promotionOffered){p.promotionOffered=true;s.pending={kind:'promotion',title:'태수 임명 제안',text:'공적을 인정받아 도시 운영을 맡아 달라는 요청을 받았습니다. 수락하면 도시별 방침을 지정할 수 있습니다.'};}
 if(!s.pending&&s.day===15)s.pending={kind:'history',title:'황건 토벌 동원령',text:'봉기가 계속되자 조정에서 추가 동원을 요청했습니다. 역사적 배경을 재구성한 시험용 사건입니다. 동원에 응하면 소속 도시 자금 300을 사용해 공적 10을 얻습니다.'};
}
export function advance(s,days){if(![1,7,30].includes(days))throw Error('1일·7일·30일만 진행할 수 있습니다.');if(s.pending)throw Error('진행 중인 사건부터 결정하세요.');let moved=0;while(moved<days&&!s.pending){tick(s);moved++;}return moved;}
export function resolve(s,choice='confirm'){
 const e=s.pending;if(!e)throw Error('진행 중인 사건이 없습니다.');
 if(!['confirm','accept','decline'].includes(choice))throw Error('잘못된 선택');
 if(e.kind==='promotion'&&choice==='accept'){actor(s).role='태수';log(s,`${actor(s).name}, 태수에 임명되었습니다.`);}
 if(e.kind==='history'&&choice==='accept'){const c=s.cities.find(c=>c.faction===actor(s).faction&&c.gold>=300);if(!c)throw Error('소속 도시의 자금이 부족합니다.');c.gold-=300;actor(s).merit+=10;log(s,'추가 동원에 응했습니다. 공적 +10.');}
 s.pending=null;
}
export function succeed(s,id){const q=s.people.find(p=>p.id===id);if(!q?.alive)throw Error('생존 인물을 선택하세요.');if(actor(s).alive)throw Error('사망 후에만 계승할 수 있습니다.');s.player=id;log(s,`${q.name}의 시점으로 이야기를 이어갑니다.`);}
export function restore(raw){
 const s=JSON.parse(raw);
 if(s?.version!==VERSION||s.scenario!=='184-prototype'||!Number.isSafeInteger(s.day)||s.day<0||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295)throw Error('지원하지 않거나 손상된 저장 파일입니다.');
 const base=createGame();
 if(!Array.isArray(s.cities)||s.cities.length!==base.cities.length||!Array.isArray(s.people)||s.people.length!==base.people.length||!Array.isArray(s.armies)||s.armies.length>100||!Array.isArray(s.logs)||s.logs.length>100)throw Error('저장 데이터 구성이 잘못되었습니다.');
 const num=(v,min=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const str=v=>typeof v==='string'&&v.length<2000;
 for(let i=0;i<s.cities.length;i++){const c=s.cities[i],b=base.cities[i];if(c.id!==i||c.name!==b.name||c.x!==b.x||c.y!==b.y||![0,1].includes(c.faction)||!['균형','농업','군비'].includes(c.order)||!['troops','gold','food','farm','training','morale'].every(k=>num(c[k]))||c.farm>100||c.training>100||c.morale>100)throw Error('도시 데이터가 잘못되었습니다.');if(c.task&&(!['개발','훈련','징병','군량'].includes(c.task.type)||!num(c.task.left,1,5)||!base.people.some(p=>p.id===c.task.by)))throw Error('명령 데이터가 잘못되었습니다.');}
 for(let i=0;i<s.people.length;i++){const p=s.people[i],b=base.people[i];if(p.id!==b.id||p.name!==b.name||![0,1].includes(p.faction)||!['군주','태수','장수','재야','포로'].includes(p.role)||typeof p.alive!=='boolean'||!num(p.merit)||!Array.isArray(p.stats)||p.stats.length!==5||!p.stats.every(v=>num(v,0,100))||!num(p.ambition,0,100)||!num(p.loyalty,0,100)||!p.relations||typeof p.relations!=='object'||!Object.entries(p.relations).every(([id,v])=>base.people.some(q=>q.id===id)&&num(v,0,100)))throw Error('인물 데이터가 잘못되었습니다.');}
 if(!actor(s)||!num(s.nextArmy,1)||!s.logs.every(l=>num(l.day)&&str(l.text)))throw Error('플레이어 또는 기록이 잘못되었습니다.');
 for(const a of s.armies)if(!num(a.id,1)||!s.cities[a.from]||!s.cities[a.to]||!roads.some(r=>r.includes(a.from)&&r.includes(a.to))||![0,1].includes(a.faction)||!num(a.troops)||!num(a.days,0,30)||!num(a.total,1,30)||!num(a.training,0,100)||!num(a.morale,0,100)||!['신중','강습','포위'].includes(a.tactic)||!['보병','기병','궁병'].includes(a.unit)||!s.people.some(p=>p.id===a.leader))throw Error('부대 데이터가 잘못되었습니다.');
 if(s.pending&&(!['history','promotion','report'].includes(s.pending.kind)||!str(s.pending.title)||!str(s.pending.text)))throw Error('사건 데이터가 잘못되었습니다.');
 return s;
}
