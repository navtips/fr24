var s=document.createElement('script');
//s.setAttribute('src','//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.1/underscore-min.js');
s.setAttribute('src','//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.js');
if(typeof _ =='undefined'){document.getElementsByTagName('head')[0].appendChild(s);};

mo=['',46.5,6.5];
ny=['',46.39,6.22];
gva=['', 46+14/60+18/3600,6+6/60+34/3600];
f24={'hex':0,'lat':1,'lon':2,'hdg':3,'alt':4,
	'spd':5,'xpdr':6,'radar':7,'type':8,'reg':9,
	'timestp1':10,'from':11,'to':12,'flight':13,'14':14,
	'vspd':15,'cs':16,'timestp1':17};
	
pp=JSON.parse('{"ne":["4CA8E4",46.99219508196157,6.9829962030413435,207,37000,442,"0332","F-LSZH1","B738","EI-ENR",1381437581,"BLL","ALC","FR9067",0,0,"RYR94J",1381443154],"s":["3C7263",45.972578052727854,6.534620315126813,350,36000,460,"5371","T-MLAT","A321","D-ALSC",1381437576,"AGP","ESS","",0,0,"BER112C",1381440934],"w":["405F10",46.43466668062896,5.150745863053034,114,37000,480,"7674","F-LFLY1","A319","G-EZFH",1381437580,"ORY","FCA","",0,0,"EZY74RC",1381441352]}');

//these 2 planes see each other as passing in front??? tbc
pp2=JSON.parse('{"210823a":["71C212",46.027994821306265,6.214456556905335,48,36000,502,"4073","F-LFLL1","A332","HL8212",1382611183,"MAD","ICN","KE914",0,0,"KAL914",1382654517],"2108c50":["44CE76",46.112388833744895,6.590108598260165,353,36000,429,"4053","F-LFLY1","A319","OO-SSV",1382611184,"NCE","BRU","",0,0,"BEL18B",1382614376]}');

function p(regexCallsign){ //array of planes matching callsign regex
	return _.filter(plane_list,function(p){return regexCallsign.test(p[f24.cs]);})
}

function pl(regex){ //plane_list object, filtered matching callsign regex
	return _.chain(plane_list)
	.pairs()
	.filter(function(p,k){return regex.test(p[1][f24.cs])})
	.object()
	.value()
}

function d(p1, p2) { //quadratic distance
	dlat=(p2[1]-p1[1])/180*Math.PI;
	dlon=(p2[2]-p1[2])/180*Math.PI;
	avglat=(p2[1]+p1[1])/2/180*Math.PI;
	return Math.pow(Math.pow(dlon*Math.cos(avglat),2)+Math.pow(dlat,2),0.5)*180/Math.PI*60;
}

function brg(p1, p2, relative) { //quadratic bearing
	relative=relative || false;
	dlat=(p2[1]-p1[1])/180*Math.PI;
	dlon=(p2[2]-p1[2])/180*Math.PI;
	avglat=(p2[1]+p1[1])/2/180*Math.PI;
	return (Math.atan2(dlon*Math.cos(avglat), dlat)*180/Math.PI - (relative?p1[f24.hdg]:0) + 3600) % 360;
}

function dt(p1, p2) { //distance along track
	return -d(p1,p2) * Math.cos((p2[3]-brg(p1,p2))/180*Math.PI);
}

function dx(p1, p2) { //distance cross track
	return d(p1,p2) * Math.sin((p2[3]-brg(p1,p2))/180*Math.PI);
}

function arr(mo){_.each(_.sortBy(_.filter(plane_list, function(el){return dt(mo,el)/el[5]*60>-1 && dt(mo,el)/el[5]*60<15 && Math.abs(dx(mo,el))<10;}), function(el){return dt(mo,el) / el[5];}), function(el){console.log(el[8]+' '+(dt(mo,el)/el[5]*60).toFixed(1)+'\' '+el[16]+' '+el[11]+' '+el[12]+' brg'+brg(mo,el).toFixed(0)+ ' x' +dx(mo,el).toFixed(0)+'nm ' +' hdg'+el[3]+'? '+el[4]+"'")});}

/* function relspd(p1, p2) { //relative speed of p1 as seen from p2.
	relx=p1[5]*Math.sin(p1[3]/180*Math.PI) - p2[5]*Math.sin(p2[3]/180*Math.PI);
	rely=p1[5]*Math.cos(p1[3]/180*Math.PI) - p2[5]*Math.cos(p2[3]/180*Math.PI);
	//var p = p1.slice(0);
	p1[5]=Math.pow(Math.pow(relx, 2) + Math.pow(rely, 2), 0.5).toFixed(1);
	p1[3]=(Math.atan2(relx, rely) / Math.PI * 180).toFixed(1);
//return p;
}
 */
function relspd(p1, p2) { //relative speed of p1 as seen from p2.
	//console.log(' ',p1);console.log('@',p2);
	
	relx=p1[5]*Math.sin(p1[3]/180*Math.PI) - p2[5]*Math.sin(p2[3]/180*Math.PI);
	rely=p1[5]*Math.cos(p1[3]/180*Math.PI) - p2[5]*Math.cos(p2[3]/180*Math.PI);
	
	//console.log(relx.toFixed(0)+'/'+rely.toFixed(0));

	var p = p1.slice(0);
	p[5]=Math.pow(Math.pow(relx, 2) + Math.pow(rely, 2), 0.5).toFixed(0);
	p[3]=((Math.atan2(relx, rely) / Math.PI * 180 + 360) % 360).toFixed(0);
return p;
}

function collisions(pl){
	//build table
	if ($("#collisions")) {$("#collisions").remove();}
	$('#playbackButton').after($('<table id="collisions"></table>'));
	$("#collisions").css({'color':'rgb(0, 0, 0)','background-color':'rgb(255, 255, 255, 0.9)','font-size':'11pt'});

	_.chain(pl || plane_list)
	.each(function(p,key){if(_.isArray(p)){p.push(key);}})
	// get scope (based on distance)
	.filter(function(el){return d(mo,el)<120 && el[f24.alt]>0;})
	//.sortBy(function(el){return d(mo,el) / el[5];})
	.tap(function(obj){scope=obj;})
	
	.each(function(p){
		//get those at same altitude
		_.chain(_(scope).cloneDeep())
		.filter(function(tgt){return Math.abs(tgt[4]-p[4])<=800 && tgt[2]!=p[2];})
		
		.tap(function(inscope){
			if(! _.isEmpty(inscope)) {
				_.chain(_(inscope).cloneDeep())
				.tap(function(inscope){})
				.each(function(tgt){tgt2=tgt.splice(0); Array.prototype.push.apply(tgt,relspd(tgt2,p));})
				//.tap(function(insc){console.log(insc);})
				.filter(function(tgt){console.log(dx(p,tgt),(brg(p,tgt,true)-180));return dt(p,tgt)>0 && dt(p,tgt)/tgt[5]*60<10 && Math.abs(dx(p,tgt))<10 && dx(p,tgt)*(brg(p,tgt,true)-180)>0;})
				//.tap(function(o){console.log('xxx '+o.length);})			

				.tap(function(tgts){
					if(! _.isEmpty(tgts)) {
						var el=p;
						console.log(''+p[8]+' '+(dt(mo,p)/el[5]*60).toFixed(1)+'\' '+el[16]+' '+el[11]+' '+el[12]+' brg'+brg(mo,el).toFixed(0)+ ' x' +dx(mo,el).toFixed(0)+'nm ' +' hdg'+el[3]+'? '+el[4]+"'");
						$("#collisions").append($('<tr data-tt-id=2 data-tt-parent-id=1><td><a href="javascript:show_aircraft_data(\''+el[18]+'\')">'+el[f24.cs]+'</a></td><td>'+el[11]+'</td><td>'+el[12]+'</td></tr>'));
						
						_(tgts)
						.sortBy(function(tgt){return Math.abs(dx(p,tgt));})
						
						.each(function(tgt){
							console.log('--> '+tgt+' ### t='+(dt(p,tgt)/tgt[f24.spd]*60).toFixed(0)+' ### dt='+dt(p,tgt).toFixed(0)+' ### dx='+dx(p,tgt).toFixed(0));
							$("#collisions").append($('<tr data-tt-id=2 data-tt-parent-id=1><td>&nbsp;'+(dt(p,tgt)/tgt[f24.spd]*60).toFixed(0)+'\' x'+dx(p,tgt).toFixed(0)+' <a href="javascript:show_aircraft_data(\''+tgt[18]+'\')">'+tgt[f24.cs]+'</a></td><td>'+tgt[11]+'</td><td>'+tgt[12]+'</td></tr>'));

						})
						//.each(function(tgt){console.log("---"+(dt(p,tgt)/tgt[5]*60).toFixed(1)+'\' '+tgt[16]+' '+tgt[11]+' '+tgt[12]+' brg'+brg(p,tgt).toFixed(0)+ ' x' +dx(p,tgt).toFixed(0)+'nm ' +' hdg'+tgt[3]+'? '+tgt[4]+"'");})
					}//tgts
				})//tap
			} //inscope
		}) //tap
	}) //each
}

collisions();
collisionsInterval=setInterval(collisions, 10000);
