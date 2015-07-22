var diameter = $("#svg-container").width();
var trans = "translate(" + diameter * 0.5 + "," + diameter * 0.5 + ")";
var interactionScore = localStorage["interactionScore"];
var interactionColor = d3.scale.linear().domain([0, 20]).range(["blue", "red"]);
var start, CHR, totalBP, region;
var pi = Math.PI;  
var selecting = 0;

var angleOffset = 5,
	arcAvail = 360 - (2 * angleOffset),
	startAngle = (angleOffset * pi)/180,
	endAngle = ((arcAvail + angleOffset) * pi) / 180;
	
var styleTooltip = function(name, description) {
  return "<p class='name'>" + name + "</p><p class='description'>" + description + "</p>";
};
    		
function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable) {
			return pair[1];
		}
	}
}

function findGeneForExon(genes, gene_id){
	for (i = 0; i < genes.length; i++) {
		if (genes[i].gene_id == gene_id)
			return genes[i];
	}
	return null;	
}

function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
}

function overlaps(s1, e1, s2, e2) {
    if (s1 < s2 & e1 < e2 & e1 > s2) {
        return 1;
    } else if (s2 < s1 & e2 > s1 & e2 < e1) {
        return 1;
    } else if (s2 > s1 & s2 < e1 & e2 < e1) {
        // return 1;
    } else if (s2 < s1 & e2 > e1) {
        return 1;
    } else if (s1 < s2 & e1 > e2) {
        return 1;
    } else if (s1 == s2 | s1 == e2 | e1 == s1 | e1 == e2) {
        return 1;
    }
    return 0;
}


function adjustBump(annot, offset) {
    var recurse = 0;
    for (var i = 0; i < annot.length; i++) {
        for (var j = 0; j < annot.length; j++) {
            if (i != j) {
                var g1 = annot[i];
                var g2 = annot[j];
                if (g1.bumpLevel == g2.bumpLevel && overlaps(g1.start - offset, g1.end + offset, g2.start - offset, g2.end + offset)) {
                    annot[i].bumpLevel++;
                    recurse = 1;
                }
            }
        }
    }
    if (recurse) {
        adjustBump(annot, offset);
    }
}


function computeCartesian(r, coord, totalBP) {
    var arcAvail = 360 - 10;
    var ratio = coord / totalBP;
    var theta = (((coord / totalBP) * arcAvail) * (pi / 180)) + (5 * (pi / 180));
    if (theta <= pi / 2) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > pi / 2 && theta <= pi) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > pi && theta <= (3 * pi) / 2) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else if (theta > (3 * pi) / 2 && theta <= 2 * pi) {
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    } else {
        theta = (arcAvail * (pi / 180)) + (5 * (pi / 180))
        return ({
            x: r * Math.sin(theta),
            y: r * Math.cos(theta) * -1
        });
    }


}


function computePath(start, end, r, totalBP, diameter) {
    // creates some d magic to connect paths
    // <path class="SamplePath" d="M100,200 C100,100 250,100 250,200
    //                                 S400,300 400,200" />
    startcoords = computeCartesian(r, start, totalBP);
    endcoords = computeCartesian(r, end, totalBP);
    //harcoded !!!!!!!!
    startcontrol = computeCartesian(r - (diameter * 0.1), start, totalBP);
    endcontrol = computeCartesian(r - (diameter * 0.1), end, totalBP);
    return ("M" + startcoords.x + "," + startcoords.y +
        " C" + startcontrol.x + "," + startcontrol.y + "," + endcontrol.x + "," + endcontrol.y + " " + endcoords.x + "," + endcoords.y);
}



function computeStrandPath(start, end, r, totalBP, flag) {
    startcoords = computeCartesian(r, start, totalBP);
    endcoords = computeCartesian(r, end, totalBP);
    //var flag = "0,1";
    if (undefined === flag){
    	flag = "0,1";    	
		if ((end - start) /totalBP > 0.5){
			flag = "1,1";
		// flag = "0,0";
		}
    }
    return ("M" + startcoords.x + "," + startcoords.y +
        " A" + r + "," + r + " 0 " + flag + " " + endcoords.x + "," + endcoords.y);
}

function computeArcPath(start, end, r1, r2, totalBP) {
    startcoords1 = computeCartesian(r1, start, totalBP);
    endcoords1 = computeCartesian(r1, end, totalBP);
    startcoords2 = computeCartesian(r2, start, totalBP);
    endcoords2 = computeCartesian(r2, end, totalBP);
    var flag1 = "0,1";
    if ((end - start) /totalBP > 0.5){
        	flag1 = "1,1";
        }
        var flag2 = "0,0";
        if ((end - start) /totalBP > 0.5) {
        flag2 = "0,1";
    }
    return ("M" + startcoords1.x + "," + startcoords1.y +
        " A" + r1 + "," + r1 + " 0 " + flag1 + " " + endcoords1.x + "," + endcoords1.y +
        " L" + endcoords2.x + "," + endcoords2.y +
        " A" + r2 + "," + r2 + " 0 " + flag2 + " " + startcoords2.x + "," + startcoords2.y +
        " z");
}

function computePointPath(start, end, score, minscore, maxscore, r, totalBP, diameter) {
    var adjMaxscore = maxscore - minscore;
    var adjScore = score - minscore;
    var trackwidth = diameter * 0.04;
    var radius = r;
    if (adjMaxscore > 0)
    	radius += ((parseFloat(adjScore) / adjMaxscore) * trackwidth)
    var startcoords = computeCartesian(radius, start, totalBP);
    return "translate(" + (startcoords.x + (diameter * 0.5)) + "," + (startcoords.y + (diameter * 0.5)) + ")";
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function log10(val) {
	return Math.log(val) / Math.LN10;
}




function renderHic(term, tissue, diameter, breadcrumb) {
	var gwas = $("#gwas").val();
	var region = $("#regionSearch").val();
	var targetIdx = $("#target")[0].options[$("#target")[0].selectedIndex].value;
	
	if (term.match(/__/g)){
		parts = term.split(/__/g);
		term = parts[0]
		region = parts[1];
		$("#regionSearch").val(region);
		console.log("here")
	}	
	
	resetPage(term, tissue, breadcrumb)
	
	url = "/chicpea/search?searchTerm=" + term + '&tissue=' + tissue+'&targetIdx='+targetIdx;
	if (gwas != "" && $.cookie('cb-enabled') == 'accepted') url += '&snp_track=' + gwas;
	if (region != "") url += '&region='+region;
	$("#regionSearch").val("");
	
	d3.json(url, function (error, json) {
		if (error) return console.warn(error);
		if (json.error) {
				$("div.radio.tissue").each(function (index, value){
						var t = $(this).find("input").val();
						$("#"+t+"_count").text("(0)")
				});
				div = d3.select("#svg-container")
				.append("div")
				.html("<h1>"+json.error+"</h1>")
				.attr("id", "message")
				.style("width", "100%")
				.style("text-align", "center")
				.style("padding-top", "200px");
			return;
		}
		data = json;
		var genes = data.genes;
		var snps = data.snps;
		var meta = data.meta;
		var extras = data.extra;
		
		totalBP = data.meta.rend - data.meta.rstart;
		start = parseInt(meta.ostart);
		CHR = meta.rchr;
		region = data.region
		                                                                 
		$("#region").val(data.region);
		$("#totalBP").val(totalBP); 
		
		var tissues = [];
		for (var i=0;i<meta.tissues.length;i++) {
			tissues[meta.tissues[i]] = 0;
		}
		
		var hics = data.hic;
		if (hics.length == 0) {
			div = d3.select("#svg-container")
				.append("div")
				.html("<h1>No interactions found</h1>")
				.attr("id", "message")
				.style("width", "100%")
				.style("text-align", "center")
				.style("padding-top", "200px");
			$.isLoading( "hide" );
			return;
		}
		for (var i = 0; i < hics.length; i++) {
		    hics[i].id = i + 1;
		}
		
		// set this to make genes that are close but not overlapping bump
		var offset = 0;
		adjustBump(genes, offset);
		var bt = {};
		for (var g in genes) {
			bt[genes[g].gene_biotype] = 1;
		}
		bt['hilight'] = 1;
		
		var vis = d3.select("#svg-container").append("svg").attr("id", "main-svg").attr("width", diameter).attr("height", diameter)
		.on("mouseup", function(d) {
				if (selecting){
					selecting = 0;
					var innerRadius = diameter * 0.4,
						outerRadius = innerRadius + 1,
						circum = 2 * innerRadius * pi,
						circAvail = circum - ((2 * angleOffset) * (pi/180) * innerRadius);
					zoomIn(innerRadius, circAvail, angleOffset);
				}
		});
		
		vis.append("text")
			.attr("x", 0).attr("y", 0)
			.attr("text-anchor", "left")  
			.style("font-size", "20px")
			.attr("class", "svg_only")
			.text($("#page_header").html());
		
		vis.append("text")
			.attr("x", 0).attr("y", 20)
			.attr("text-anchor", "left")
			.style("font-size", "14px")
			.style("font-style", "italic")
			.attr("class", "svg_only")
			.text("SNP Data: "+$('#gwas option:selected').text());
		
		
//		var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);	
		
		vis.append("g").attr("class", "left arrow_heads").selectAll("defs")
			.data(Object.keys(bt))
			.enter()
			.append("marker")
			.attr("id", function (d) {
			return ("lharrow_" + d);
		})
		.attr("viewBox", "-1 0 6 6")
		.attr("refX", -0.1)
		.attr("refY", 3)
		.attr("markerUnits", "strokeWidth")
		.attr("markerWidth", 1)
		.attr("markerHeight", 1)
		.attr("orient", "auto")
		.append("path")
		.attr("d", "M0,0 L-1,3 L0,6")
		.attr("class", function (d) {
				if (d =='hilight') return "hilight";
				else return d;
		});
		
		vis.append("g").attr("class", "right arrow_heads").selectAll("defs")
			.data(Object.keys(bt))
			.enter()
			.append("marker")
			.attr("id", function (d) {
			return ("rharrow_" + d);
		})
		.attr("viewBox", "0 0 6 6")
		.attr("refX", 0.1)
		.attr("refY", 3)
		.attr("markerUnits", "strokeWidth")
		.attr("markerWidth", 1)
		.attr("markerHeight", 1)
		.attr("orient", "auto")
		.append("path")
		.attr("d", "M0,0 L1,3 L0,6")
		.attr("class", function (d) {
				if (d =='hilight') return "hilight";
				else return d;
		});
		
		
		addSNPTrack(data.snps);
		addCenterScale(data.frags);
		
		if (extras.length > 0) addExtraData(extras);		
		
		//add gene track
		addGeneTrack(data.meta, data.genes, totalBP);
		
		//add SNP track
		$("#maxScore").val(addSNPTrackPoints(data.meta, data.snps, totalBP));
		
		addInteractions(data.meta, hics, totalBP, tissues);

		var endAngle = (angleOffset * pi)/180,
		startAngle = ((arcAvail + angleOffset) * pi) / 180;
			
		var arc = d3.svg.arc()
			.innerRadius(diameter * 0.29).outerRadius(diameter * 0.4)
			.startAngle(-endAngle).endAngle(endAngle);
	
		var wedge = vis.append("path").attr("d", arc).attr("id", "originWedge")
			.attr("fill", "lightgrey")
			.attr("transform", trans)
/*			.on("mouseout", function (d) {
					if (selecting){
						selecting = 0;
						zoomIn(innerRadius, circAvail, angleOffset);
					}
			})*/
			.on("click", function(d){
					id = $("#breadcrumb").children().last().attr('id')
					if (id.match(/__/g)){
						parts = term.split(/__/g);
						term = parts[0]
						region = parts[1];
						$("#regionSearch").val("");
						var tissue = $("input:radio[name=tissue]:checked").val();
						renderHic(term, tissue, diameter, 1);
					}
			});
			
		if ($("#breadcrumb").children().last().attr('id').match(/__/g)){
			wedge.style('cursor', 'zoom-out');
		}
			
				
		var text = vis.append("text")
			.attr("x", 10).attr("dy", -5);
	
		text.append("textPath")
			.attr("xlink:href","#originWedge")
			.text("chr"+CHR)
		
		for(var t in tissues) {
			$("#"+t+"_count").text("("+tissues[t]+")");
		}
		
		// end of JSON call     
	});
}

function addCenterScale(frags){
	var vis = d3.select("#main-svg");

    var innerRadius = diameter * 0.4,
    	outerRadius = innerRadius + 1,
		circum = 2 * innerRadius * pi,
		circAvail = circum - ((2 * angleOffset) * (pi/180) * innerRadius);
    
	tickData = getTickData(innerRadius, arcAvail, startAngle, endAngle, circum, circAvail);
	
	var scale_group = vis.append("g").attr("class", "track scale")
		.attr("id", "fullScale").selectAll("svg")
		.data([1]).enter();
		
	var arc = d3.svg.arc()
		.innerRadius(innerRadius).outerRadius(outerRadius)
		.startAngle(startAngle).endAngle(endAngle);
			
	var arc2 = d3.svg.arc()
		.innerRadius(diameter * 0.28 - 10).outerRadius(outerRadius+50)
		.startAngle(startAngle).endAngle(endAngle);
	
	scale_group.append("path").attr("d", arc).attr("id", "arcScale");	
	
	var ticks = scale_group.append("g").attr("class", "scale ticks").selectAll("svg")
		.data(tickData).enter()
		.append("g")
		.attr("class", "tick")
		.attr("transform", function (d) {
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + outerRadius + ",0)";
		});

	ticks.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", 8)
		.attr("y2", 0)
		.style("stroke", "#000");

	ticks.append("text")
		.attr("x", 8)
		.attr("dy", ".35em")
		.attr("transform", function(d) { return d.angle > pi ? "rotate(180)translate(-16)" : null; })
		.style("text-anchor", function(d) { return d.angle > pi ? "end" : null; })
		.text(function(d) { return d.label; });
	
	fragsData = getFragsTicks(frags, outerRadius, arcAvail, startAngle, endAngle, circum, circAvail);
	
	var frags = scale_group.append("g").attr("class", "scale ticks frags").selectAll("svg")
		.data(fragsData).enter()
		.append("g")
		.attr("class", "tick").append("line")
		.attr("x1", function(d){ return d.x1; })
		.attr("y1", function(d){ return d.y1; })
		.attr("x2", function(d){ return d.x2; })
		.attr("y2", function(d){ return d.y2; })
		.style("stroke", "red");		
	
	scale_group.append("path").attr("d", arc2).attr("id", "arcBackground").style("fill", "white").style("opacity", 0)
	
	//var colors = d3.scale.linear().domain([angleOffset, arcAvail]).range(["pink", "purple"]);
	var segmentData = [];
	for (i=angleOffset; i<=arcAvail; i+=angleOffset){
		segmentData.push(i);
	}
	var segments = scale_group.append("g").selectAll("svg").data(segmentData).enter();
	segments.append("path")
		.attr("d", d3.svg.arc()
			//.innerRadius(diameter * 0.28)
			.innerRadius(0)
			.outerRadius(outerRadius+40)
			.startAngle(function(d){ return d*pi/180; })
			.endAngle(function(d){ return (d+angleOffset)*pi/180; }))
		.style("fill", "white").style("opacity", 0)
		.attr("class", "segment")
		.attr("id", function (d) { return "seg"+d; })
		.on("mousedown", function(d) {
				d3.event.preventDefault();
				d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
				d3.select(this).style("opacity", 0.2).style("fill",  "yellow");
				d3.select(this).classed('selected', true);
				selecting = d;
		})
		.on("mouseup", function(d) {
				if (selecting){
					selecting = 0;
					zoomIn(innerRadius, circAvail, angleOffset);
				}
		})
/*		.on("click", function (d) {
				if (selecting){
					selecting = 0;
					zoomIn(innerRadius, circAvail, angleOffset);
				}
				else{
					d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
					d3.select(this).style("opacity", 0.2).style("fill",  "yellow");
					d3.select(this).classed('selected', true);
					selecting = d;
				}
		})	*/			
		.on("mouseover", function(d){ 
				if (selecting > 0){
					if (selecting != d && selecting != d+angleOffset && selecting != d-angleOffset){
						s1 = Math.min(selecting, d);
						s2 = Math.max(selecting, d);
						for (i=s1; i<s2; i+=angleOffset){
							d3.select("path#seg"+i).style("opacity", 0.2).style("fill", "yellow");
							d3.select("path#seg"+i).classed('selected', true);
						}
					}
					//d3.select(this).style("opacity", 0.3).style("fill", colors(d));
					d3.select(this).style("opacity", 0.2).style("fill", "yellow");
					d3.select(this).classed('selected', true);
				}
		});
	
	vis.select("#fullScale").attr("transform", trans)
}

function getFragsTicks(frags, outerRadius){
	var data = [];
	if (frags.length > 0){
		for (var i = 0; i < frags.length; i++) {
			position = frags[i].end;
			var startcoords = computeCartesian(outerRadius, position, totalBP);
			var endcoords = computeCartesian(outerRadius+5, position, totalBP);
			data.push({'x1':startcoords.x, 'y1':startcoords.y, 'x2':endcoords.x, 'y2':endcoords.y});
		}
	}
	return data;	
}

function getTickData(innerRadius, arcAvail, startAngle, endAngle, circum, circAvail){
	
	var end = start + totalBP;
	
	var divisor = 100000, multiplier = 10;
	if (totalBP < 500000) {
		divisor = divisor/10;
		multiplier = multiplier*10;
	}
	
	var data = [{'label': null, 'angle': startAngle, 'position': start}];

	var position1 = 1000000 * Math.ceil(start/divisor)/multiplier
    var theta1 = ((((position1-start) / totalBP) * arcAvail) * (pi / 180)) + startAngle;
	data.push({'label': position1/1000000+"Mb", 'position': position1, 'angle': theta1});

	var position2 = 1000000 * Math.floor(end/divisor)/multiplier
    var theta2 = ((((position2-start) / totalBP) * arcAvail) * (pi / 180)) + startAngle;

	var count = Math.ceil((position2-position1)/divisor);
	var section = (theta2 - theta1) / count;

	var totalAngle = theta1;
	for (i=position1+divisor; i<position2; i+=divisor){
		label = Math.ceil(i/divisor)/multiplier
		totalAngle += section
		data.push({'label': label+"Mb", 'position': i, 'angle': totalAngle});
	}
    
	data.push({'label': position2/1000000+"Mb", 'position': position2, 'angle': theta2});	
	data.push({'label': null, 'angle': endAngle, 'position': end});
	
	return data;
}
	

function addExtraData(extras){
	var vis = d3.select("#main-svg");
	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("width", "100px");
	
	var path = vis.append("g").attr("class", "track extras3").selectAll("svg")
		.data(extras.filter(function (d) { return CHR==d.chr; }))
		.enter()
		.append("path")
		.attr("d", function (d) {
				padding = (totalBP/1000) - (d.end-d.start);
				return (computeStrandPath(d.start-(padding/2), d.end+(padding/2), diameter * 0.35, totalBP));
		})
		.attr("transform", trans)
		.attr("stroke", "red")
		.attr("stroke-width", "100")
		.on("mouseover", function (d) {
			div.transition().duration(200).style("opacity", 0.9).attr("class", "tooltip");
			div.html(d.name).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY) + "px");
			d3.select(this).style("opacity", 0.3);
		})
		.on("mouseout", function (d) {
				div.transition().duration(500).style("opacity", 0);
				d3.select(this).style("opacity", 1);
		});
}

function addGeneTrack(meta, genes, totalBP){
	
	var vis = d3.select("#main-svg");
//	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("width", "200px");
	var maxscore = 0;
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	var innerRadius = diameter * 0.35;
	
	var gene = vis.append("g").attr("class", "track genes").selectAll("svg").data(genes).enter();
	    
	gene.append("path")
		.attr("id", function (d) { return d.gene_id; })
		.attr("d", function (d) {
			return (computeStrandPath(d.start, d.end, innerRadius + (d.bumpLevel * 15), totalBP));
		})
		.attr("transform", trans)
		.attr("class", function (d) {
				if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
					return "gene hilight";
				} else {
					return "gene "+d.gene_biotype;
				}
		})
		.attr("marker-start", function (d) {
			var bt = d.gene_biotype;
			if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
				bt = 'hilight';
			}
			if (d.strand == "-") return ("url(#lharrow_" + bt + ")");
		})
		.attr("marker-end", function (d) {
			var bt = d.gene_biotype;
			if (d.gene_name == $("#search_term").val().toUpperCase() || d.gene_id == $("#search_term").val().toUpperCase()) {
				bt = 'hilight';
			}
			if (d.strand == "+") return ("url(#rharrow_" + bt + ")");
		})
		.on("click", function (d) {
				$("#search_term").val(d.gene_name);
				var term = $("#search_term").val().toUpperCase();
				div.transition().duration(500).style("opacity", 0);
				d3.selectAll("svg").remove();
				renderHic(term, tissue, diameter, 1);
				return false;
		})
		/*.on("mouseover", function (d, i) {
			div.transition().duration(200).style("opacity", 0.9).attr("class", "tooltip");
			div.html(d.gene_name + "</br>" + d.gene_biotype + "</br>" + d.gene_id + "</br>" + numberWithCommas(parseInt(d.start) + start) + "</br>" + numberWithCommas(parseInt(d.end) + start))
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
				                                                                    
			d3.select(this).style("opacity", 0.3);
		})
		.on("mouseout", function (d) {
				div.transition().duration(500).style("opacity", 0);
				d3.select(this).style("opacity", 1);
		});*/
		
		vis.selectAll("path.gene")
			.attr("title", function(g) { return styleTooltip(g.gene_name, g.gene_biotype + "</br>" + g.gene_id + "</br>" + numberWithCommas(parseInt(g.start) + start) + "</br>" + numberWithCommas(parseInt(g.end) + start)) })
			.each(function(g) {
					var pos = {top: 0, left: 0, width:0, height:0};
					$(this).on('mouseenter',function(e){
							pos.top = e.pageY
							pos.left = e.pageX
					}).tipsy({ gravity: $.fn.tipsy.autoNSEW, opacity: 1, html: true, pos: pos }); });

			
/*		gene.append("text")
	        .style("text-align", "left")
	        .attr("class", "svg_only")
	        .attr("transform", function (d) {
	        		return (computePointPath(d.start, d.end, 0, 0, 0, (diameter * 0.36) + (d.bumpLevel * 15), totalBP, diameter))
	        })
			.text(function (d) {
	        		//console.log(d.gene_name);
	        		return d.gene_name;
	        });*/
}

function addSNPTrack(snps){
	
	var vis = d3.select("#main-svg");
	var maxscore = 0;
	var thresh = -1 * log10(1e-1);	
	
	for (var i = 0; i < snps.length; i++) {
		if (snps[i].score > maxscore) {
			maxscore = parseFloat(snps[i].score);
		}
	}
	
	var innerRadius = diameter * 0.29
		outerRadius = innerRadius + (diameter * 0.05),
		gwSigRadius = innerRadius+(parseFloat(7.03-thresh) / (maxscore-thresh)) * (outerRadius-innerRadius-(diameter*0.01))
		
	var arc = d3.svg.arc()
		.innerRadius(innerRadius).outerRadius(outerRadius)
		.startAngle(startAngle).endAngle(endAngle);
		
	var snpBackground = vis.append("g").attr("class", "track snps background").selectAll("svg")
		.data([1]).enter();
	
	snpBackground.append("path").attr("d", arc).style("fill", "lightgrey").style("opacity", 0.3).attr("transform", trans);
	if (maxscore >= 7.03){
		snpBackground.append("path")
		.attr("d", d3.svg.arc()
			.innerRadius(gwSigRadius-2).outerRadius(gwSigRadius)
			.startAngle(startAngle).endAngle(endAngle)
		).style("fill", "white").attr("class", "cookie_hide").attr("transform", trans);
	}
}

function addSNPTrackPoints(meta, snps, totalBP){
	
	var vis = d3.select("#main-svg");
	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("width", "200px");
	var maxscore = 0;
	var tissue = $("input:radio[name=tissue]:checked").val();
	var thresh = -1 * log10(1e-1);	
	var innerRadius = diameter * 0.29;
	
	for (var i = 0; i < snps.length; i++) {
		if (snps[i].score > maxscore) {
			maxscore = parseFloat(snps[i].score);
		}
	}
	
	var symb = d3.svg.symbol();
	symb.size(15);
	vis.append("g").attr("class", "track snps cookie_hide").selectAll("svg")
		.data(snps.filter(function (d) {
				return parseFloat(d.score) >= thresh;
		}))
		.enter()
		.append("path")
		.attr("transform", function (d) {
				return (computePointPath(d.start, d.end, d.score, thresh, maxscore, innerRadius, totalBP, diameter))
		})
		.attr("class", "snp")
		.attr("d", symb)
//		.attr("stroke", function (d) {
//				//if (parseFloat(d.score) == maxscore) return "red";
//				if (parseFloat(d.score) >= 7.03) return "green";
//				return "darkgrey";
//		})
		.attr("fill", function (d) {
				//if (parseFloat(d.score) == maxscore) return "red";
				if (parseFloat(d.score) >= 7.03) return "green";
				return "darkgrey";
		})
/*		.on("mouseover", function (d, i) {
				div.transition().duration(200).style("opacity", 0.9);
				div.html(d.name + "</br>P Value (-log10) = " + parseFloat(d.score).toFixed(2) + "</br>" + numberWithCommas(parseInt(d.start) + parseInt(meta.rstart)) + "</br>")
				.attr("class", "tooltip")
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
				                                                     
				d3.select(this).style("opacity", 0.3);
		})
		.on("mouseout", function (d) {
				div.transition().duration(500).style("opacity", 0);
				d3.select(this).style("opacity", 1);
		})*/                                                     
		.on("click", function (d) {
				div.transition().duration(0).style("opacity", 0);
            	$("#search_term").val(d.name);
            	var term = $("#search_term").val()
            	d3.selectAll("svg").remove();
            	renderHic(term, tissue, diameter, 1);
            	return false;
		})
		
		vis.selectAll("path.snp")
			.attr("title", function(s) { return styleTooltip(s.name, "P Value (-log10) = " + parseFloat(s.score).toFixed(2) + "</br>" + numberWithCommas(parseInt(s.start) + parseInt(meta.rstart))) })
			.each(function(s) { $(this).tipsy({ gravity: "w", opacity: 1, html: true }); });
		
		return maxscore;
}

function addInteractions(meta, hics, totalBP, tissues) {
	// add hic links
	
	var vis = d3.select("#main-svg");
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	var path = vis.append("g").attr("class", "middle hic").selectAll("svg")
		.data(hics)
		.enter()
		.append("path")
		.attr("id", function (d, i) {
				return ('p' + i);
		})
		.attr("class", function(d){
				classes = "interaction";
				for (var i=0;i<meta.tissues.length;i++) {
					if (parseFloat(d[meta.tissues[i]]) >= localStorage["interactionScore"]){
						classes += " "+meta.tissues[i];
						tissues[meta.tissues[i]]++;
					}
				}
				return classes;
		})
		.attr("d", function (d) {
				return computePath(d.baitStart + ((d.baitEnd - d.baitStart) / 2), d.oeStart + ((d.oeEnd - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
		})
		.attr("transform", trans)
		.attr("fill", "none")
		.attr("stroke-width", 3);
		
		pathDetails(path);
		
		vis.selectAll("path.interaction").sort(function (a, b) {
				if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
				if (a[tissue] > b[tissue]) return 1;
				if (b[tissue] > a[tissue]) return -1;
				else return 0;
		});
}

function pathDetails(interactions){
	var vis = d3.select("#main-svg");
//	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("width", "100px");
	var tissue = $("input:radio[name=tissue]:checked").val();
	
	data = interactions.data();
	
	//var totalBP = $("#totalBP").val();
	
	interactions.attr("stroke", function (d) {
			if (parseFloat(d[tissue]) >= localStorage["interactionScore"]){
				return interactionColor(d[tissue]);
			}
			else{
				return "lightgrey";
			}
	})
	.on("mouseover", function (d, i) {
			//div.transition().duration(200).style("opacity", 0.9).attr("class", "tooltip");
			//div.html("Score " + parseFloat(d[tissue]).toFixed(2)).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
			
			vis.selectAll("path.interaction").sort(function (a, b) {
					if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
					if (a[tissue] > b[tissue]) return 1;
					if (b[tissue] > a[tissue]) return -1;
					else return 0;
			});
			
			if (d3.select(".updateClick").node() != null){
				this.parentNode.appendChild(d3.select(".updateClick").node());
			}
			
			d3.select(this).classed('hover', true);
			//this.parentNode.appendChild(this);
			
//			if (this.getAttribute("stroke") != "yellow"){
//			if(this.classList.contains("hover")){
//				console.log("here");
//				this.parentNode.appendChild(this);
//			}
			//this.parentNode.appendChild(this);
			
			vis.append("path")
				.attr("class", "deleteMe")
				.attr("d", computeArcPath(d.oeStart, d.oeEnd, diameter * 0.28, diameter / 2.5, totalBP))
				.style("stroke-width", 1)
				.style("stroke", "red")
				.attr("transform", trans)
				.attr("fill", "none")
				
			vis.append("path")
				.attr("class", "deleteMe")
				.attr("d", computeArcPath(d.baitStart, d.baitEnd, diameter * 0.28, diameter / 2.5, totalBP))
				.style("stroke-width", 1)
				.style("stroke", "blue")
				.attr("transform", trans)
				.attr("fill", "none")
	})
	.on("mouseout", function (d, i) {
			//div.transition().duration(500).style("opacity", 0);
			d3.select(this).classed('hover', false);
			vis.selectAll(".deleteMe").remove();			
			
			vis.selectAll("path.interaction").sort(function (a, b) {
					if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
					if (a[tissue] > b[tissue]) return 1;
					if (b[tissue] > a[tissue]) return -1;
					else return 0;
			});
			
			if (d3.select(".updateClick").node() != null){
				this.parentNode.appendChild(d3.select(".updateClick").node());
			}
	})
	.on("click", function (d) {
			resetVis();
            $(".deleteMe").attr('class', 'deleteClick');
            d3.selectAll(".hicScore").classed('deleteClick', true);
            d3.select(this).classed('updateClick', true);
			
			$("#footer-bait").html('chr' + CHR + ':' + numberWithCommas(d.baitStart_ori) + '..' + numberWithCommas(d.baitEnd_ori) + " (" + ((d.baitEnd_ori - d.baitStart_ori) / 1000).toFixed(2) + "KB)");
			$("#footer-target").html('chr' + CHR + ':' + numberWithCommas(d.oeStart_ori) + '..' + numberWithCommas(d.oeEnd_ori) + " (" + ((d.oeEnd_ori - d.oeStart_ori) / 1000).toFixed(2) + "KB)");
			
			drawRegionPanel("bait", CHR, d.baitStart_ori, d.baitEnd_ori, $("#maxScore").val());
			drawRegionPanel("target", CHR, d.oeStart_ori, d.oeEnd_ori, $("#maxScore").val());
	});
	
	interactions.sort(function (a, b) {
			if (parseFloat(a[tissue]) < localStorage["interactionScore"]) return -1;
			if (a[tissue] > b[tissue]) return 1;
			if (b[tissue] > a[tissue]) return -1;                                                                 
			else return 0;
	});
	
	vis.selectAll("path.interaction")
		.attr("title", function(hic) { return styleTooltip("Score " + parseFloat(hic[tissue]).toFixed(2), "") })
		.each(function(hic) {
			var pos = {top: 0, left: 0, width:0, height:0};
			$(this).on('mouseenter',function(e){
					pos.top = e.pageY
					pos.left = e.pageX
		}).tipsy({ gravity: $.fn.tipsy.autoNSEW, opacity: 1, html: true, pos: pos, offset: 5, className: 'hicScore' }); });
}

function drawRegionPanel(type, chr, start, end, maxscore) {	
	var region = chr+':'+start+'-'+end,
		data1 = [start, end],
		w = $("#panel-" + type).width(), h = 270, trackHeight = 90,
		margin = {top: 10, right: 10, bottom: 10, left: 10},
		formatxAxis = d3.format('0,000,000f'),
		xRange = d3.scale.linear().domain([d3.min(data1), d3.max(data1)]).range([(3 * margin.left), (w - margin.left)]),
		regionStart = d3.min(data1),
		tissue = $("input:radio[name=tissue]:checked").val()
		borderColor = "red";
		
//	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    var gwas = $("#gwas").val();
    
    $("#panel-" + type).isLoading({ text: "Loading", position: "overlay" });
		
	d3.json("/chicpea/subSearch?region=" + region + '&tissue=' + tissue + '&snp_track=' + gwas, function (error, data) {
			if (error) { $("#panel-" + type).isLoading( "hide" ); return console.warn(error);}
			
			if (type === 'bait') borderColor = 'blue';
			else if(type === 'target') borderColor = "red";
			
			//console.log(data);
			adjustBump(data.genes, 100);	
			
			//Create the SVG Viewport
			var svgContainer = d3.select("#panel-" + type).append("svg:svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", type + "-svg");
				
			svgContainer.append("text")
				.attr("x", 0).attr("y", 0)
				.attr("text-anchor", "left")  
				.style("font-size", "18px")
				.style("color", borderColor)
				.attr("class", "svg_only")
				.text(type.substring(0,1).toUpperCase() + type.substring(1));
				
			var rectangle = svgContainer.append("rect")
				.attr("x", -10).attr("y", -30)
				.attr("width", w+10+margin.left+margin.right).attr("height", h+30+margin.top+margin.bottom)
				.style("stroke", borderColor)
				.style("fill", "none")
				.style("stroke-width", 1)
				.attr("class", "svg_only");
			
			//Create the Axis
			var xAxis = d3.svg.axis()
				.scale(xRange)
				.ticks(4)
				.tickFormat(formatxAxis);
			
			//Create an SVG group Element for the Axis elements and call the xAxis function
			var xAxisGroup = svgContainer.append("svg:g")
				.attr("class", "x axis").attr("id", type+"XAxis")
				.attr("transform", "translate(0," + (h - margin.top - margin.bottom) + ")")
				.call(xAxis);
				
			// TRACK 1 - SNPS
			var yRangeS = d3.scale.linear().domain([0, maxscore]).range([trackHeight - margin.top, margin.top]);
			
			var yAxis = d3.svg.axis()
				.scale(yRangeS)
				.ticks(3)
				.tickFormat(d3.format('.0f'))
				.tickSize(-(w - margin.right - 3 * margin.left), 0, 0)
				.orient("left");
			
			var yAxisGroup = svgContainer.append("svg:g")
				.attr("class", "y axis").attr("id", type+"YAxis")
				.attr("transform", "translate(" + (3 * margin.left) + ",0)")
				.call(yAxis);
			
			yAxisGroup.append("text")
				.attr("class", "y label")
				.style("text-anchor", "middle")
				.attr("text-anchor", "end")
				.attr("y", -2.5 * margin.left)
				.attr("x", -(0.5 * trackHeight))
				.attr("dy", ".75em")
				.attr("transform", "rotate(-90)")
				.text("P Value (-log10)");
				
			var snp = svgContainer.append("g").attr("class", "track snps cookie_hide").attr("id", type+"SNPTrack")
				.selectAll(".snp")
				.data(data.snps)
				.enter().append("g")
				.attr("class", "snp");		
			
			snp.append("path")
				.attr("class", "marker")
				.attr("d", d3.svg.symbol().size(30))
				.attr("stroke", function (d) {
					//if (parseFloat(d.score) == maxscore) return "red";
					if (parseFloat(d.score) >= 7.03) return "green";
					return "lightgrey";
				})
				.attr("fill", function (d) {
					//if (parseFloat(d.score) == maxscore) return "red";
					if (parseFloat(d.score) >= 7.03) return "green";
					return "lightgrey";
				})
				.attr("transform", function (d) {
					return "translate(" + xRange(d.start + regionStart) + "," + yRangeS(d.score) + ")";
				})
				/*.on("mouseover", function (d, i) {
						div.transition().duration(200).style("opacity", 0.9).attr("class", "tooltip");
						div.html(d.name + "</br>" + d3.round(d.score, 3) + "</br>" + numberWithCommas(parseInt(d.start) + parseInt(regionStart)))
							.style("left", (d3.event.pageX + 10) + "px")
							.style("top", (d3.event.pageY - 18) + "px");
						d3.select(this).style("opacity", 0.3);
				})
				.on("mouseout", function (d) {
						div.transition()
							.duration(500)
							.style("opacity", 0);
						d3.select(this).style("opacity", 1);
				})*/;
		
			svgContainer.selectAll("path.marker")
				.attr("title", function(s) { return styleTooltip('<a href="http://www.immunobase.org/page/Overview/display/marker/'+s.name+'" target="_blank">'+s.name+'</a>', "P Value (-log10) = " + d3.round(s.score, 3) + "</br>" + numberWithCommas(parseInt(s.start) + parseInt(regionStart))) })
				.each(function(s) { $(this).tipsy({ gravity: $.fn.tipsy.autoWE, opacity: 1, html: true, delayOut: 2000 }); });
				
			// TRACK 2 - GENES
			var yRangeG = d3.scale.linear().domain([0, trackHeight]).range([margin.top, margin.top + trackHeight]);
			var geneTrackOffset = trackHeight + (margin.top);
			
			var lineFunction = d3.svg.line()
				.x(function (d) {
				return d.x;
			})
				.y(function (d) {
				return d.y;
			})
			.interpolate("linear");
				
			var gene = svgContainer.append("g").attr("class", "track genes").attr("id", type+"GeneTrack")
				.selectAll(".gene")
				.data(data.genes)

			gene.enter().append("g")
				.attr("class", "gene")
				.attr("id", function (d) {
				return d.gene_id;
			});
				
			gene.append("text")
                .style("text-align", "right")
				.attr("y", function (d) {
				return geneTrackOffset + yRangeG(30 * d.bumpLevel);
			})
				.attr("x", function (d) {
				return xRange(d.start + regionStart) - 1.5*margin.left;
			})
				.attr("transform", function (d) {
				return "translate(0,-2)";
			})
				.text(function (d) {
				return d.gene_name;
			});
				
			gene.append("path")
				.attr("class", function (d) {
				return "line " + d.gene_biotype;
			})
			.attr("style", "stroke-width:1px")
				.attr("d", function (d) {
				return lineFunction([{
					x: xRange(d.start + regionStart),
					y: geneTrackOffset + 6 + yRangeG((30 * d.bumpLevel))
				}, {
					x: xRange(d.end + regionStart),
					y: geneTrackOffset + 6 + yRangeG((30 * d.bumpLevel))
				}]);
			});

			var exon = gene.append("g").attr("class", "track exons").selectAll(".exon")
				.data(function (d) {
					return data.exons[d.gene_id];
				})
				.enter().append("g")
				.attr("class", "exon")
				
			exon.append("path")
				.attr("d", function (d) {
					geneObj = findGeneForExon(gene.data(), d.name);
						if (geneObj.strand == "-") {
							return lineFunction([{
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart) - 5,
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 6
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}]);
						} else {
							return lineFunction([{
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 12
							}, {
								x: xRange(d.end + regionStart) + 5,
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel)) + 6
							}, {
								x: xRange(d.end + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}, {
								x: xRange(d.start + regionStart),
								y: geneTrackOffset + yRangeG((30 * geneObj.bumpLevel))
							}])
						}
    			})
				.attr("class", function (d) {
					geneObj = findGeneForExon(gene.data(), d.name);
					var classes = "line " + geneObj.gene_biotype;
					if (d.start != d.end && d.score > 0) { classes += " tss"; }
					return classes;
			});
			
			
				
			// TRACK 3 - BLUEPRINT
			var yRangeB = d3.scale.linear().domain([0, trackHeight]).range([margin.top, margin.top + trackHeight]);
			var trackOffset = $('g#'+type+'GeneTrack').get(0).getBBox().height + $('g#'+type+'GeneTrack').get(0).getBBox().y;			
			if (trackOffset == 0){ // No genes to display!
				trackOffset = $('g#'+type+'YAxis').get(0).getBBox().height + $('g#'+type+'YAxis').get(0).getBBox().y;
			}

			var line = d3.svg.line()
				.interpolate("linear")
				.x(function (d) { return xRange(d.x+regionStart); })
				.y(function (d) { return yRangeB(d.y); });
			
			var blueprintTrack = svgContainer.append("g").attr("class", "track blueprint");
				
			
			for (var sample in data.blueprint){
				if (data.blueprint[sample].length == 0)
					continue;
				
				trackOffset += margin.top;
				
				var blueprint = blueprintTrack.append("g").attr("class", sample)
				
				var states = blueprint.selectAll(".blueprint")
					.data(data.blueprint[sample])
					.enter(); 
				
				/*var blueprint = svgContainer.append("g").attr("class", "track blueprint "+sample).selectAll(".blueprint")
					.data(data.blueprint[sample])
					.enter(); //.append("g");
					//.attr("class", "blueprint");*/
				
				states.append("path")
					.attr("class", "line")
					.attr("d", function (d) {
							return line([ { x: d.start, y: trackOffset}, { x: d.end, y: trackOffset }]);
					})
					.attr("stroke", function (d) { return "rgb("+d.color+")"; })
					.attr("stroke-width", "6px")
					.on("mouseover", function (d, i) {
							div.transition().duration(200).style("opacity", 0.9).attr("class", "tooltip");
							div.html("<strong>"+d.desc+"</strong>")
								.style("left", (d3.event.pageX + 10) + "px")
								.style("top", (d3.event.pageY - 18) + "px");
							d3.select(this).style("opacity", 0.3);
					})
					.on("mouseout", function (d) {
							div.transition()
								.duration(500)
								.style("opacity", 0);
							d3.select(this).style("opacity", 1);
					});
					
					blueprint.append("text")
						.attr("x", 0)
						.attr("y", trackOffset+10)
						.attr("dy", ".35em")
						.style("font-size", "0.9em")
						.text(sample)
			}
			$("#panel-" + type).isLoading( "hide" ); 
	});	
}

function resetPage(term, tissue, breadcrumb) {
    d3.selectAll("svg").remove();
    $(".tipsy").remove();
    resetVis();
    $("#search_term").val(term);
    $("#page_header").html(term + " in " + tissue.replace(/_/g, " ") + " Tissues");
    termText = term
    termId = term
    if ($("#regionSearch").val() != '' && $("#regionSearch").val() != term){
    	termText = term+" ("+$("#regionSearch").val()+")";
    	termId = term+"__"+$("#regionSearch").val();
    }
    if (breadcrumb) $("#breadcrumb").append('<li id="BC-' + termId + '"><a href="#" onclick=\'javascript:d3.selectAll("svg").remove(); $(document.getElementById("BC-'+termId+'")).remove();  renderHic("' + termId + '", $("input:radio[name=tissue]:checked").val(), '+diameter+', 1)\'>' + termText + '</a></li>');
}

function renderVis() {
	resetVis();
	var tissue = $("input:radio[name=tissue]:checked").val();
	var term = $("#search_term").val();
	renderHic(term, tissue, diameter, 0);
}

function resetVis() {
//	d3.select("div.tooltip").transition().duration(0).style("opacity", 0);
	d3.select("#message").remove();	
	d3.select("#svg-container").selectAll(".deleteClick").remove();
	$(".deleteClick").remove();
	d3.select("#svg-container").selectAll(".updateClick").classed('updateClick', false);
	d3.select("#bait-svg").remove();
	d3.select("#target-svg").remove();
	$("#footer-bait").html("&nbsp;");
	$("#footer-target").html("&nbsp;");
}

function zoomIn(innerRadius, circAvail, angleOffset){
	selectedArray = d3.selectAll(".selected")[0];
	d3.select("div.tooltip").transition().duration(0).style("opacity", 0);
	if (selectedArray.length > 0) {
		s1 = parseInt(selectedArray[0].id.replace("seg", ""))
		s2 = parseInt(selectedArray[selectedArray.length-1].id.replace("seg", ""))
		var l1 = (s1-angleOffset) * (pi/180) * innerRadius
		var l2 = s2 * (pi/180) * innerRadius
		var p1 = Math.ceil(start+(l1*(totalBP/circAvail)))
		var p2 = Math.ceil(start+(l2*(totalBP/circAvail)))
		var region = CHR+":"+p1+"-"+p2;
		var gwas = $("#gwas").val();
		var tissue = $("input:radio[name=tissue]:checked").val();
		$("#regionSearch").val(region);
		var term = $("#search_term").val();
		renderHic(term, tissue, diameter, 1)
		$("#regionSearch").val("");
	}
}
	

$(document).ready(function () {
    $("#pushme").bind("click", function () {
    		var tissue = $("input:radio[name=tissue]:checked").val();
    		var term = $("#search_term").val();
    		renderHic(term, tissue, diameter, 1)
    		return (false);
    });

    $("input:radio[name=tissue]").bind("click", function () {
    		var tissue = $("input:radio[name=tissue]:checked").val();
    		var gene = $("#search_term").val();
    		$("#page_header").html(gene + " in " + tissue.replace(/_/g, " ") + " Tissues");
    		
    		resetVis();
    		pathDetails(d3.select("#svg-container").selectAll("path.interaction"));
    });
    
    $(document).keyup(function(e) {
		if (e.keyCode == 27) { 
			selecting = 0;
			d3.selectAll(".segment").classed("selected", false).style("fill", "white").style("opacity", 0);
		}
    });
});

var termParam = getQueryVariable("term");
if (termParam == undefined){ termParam = 'IL2RA'; }
$("input:radio[name=tissue]:first").attr('checked', true);
var tissueParam = $("input:radio[name=tissue]:checked").val();
renderHic(termParam, tissueParam, diameter, 1)
//renderHic(termParam, 'Total_CD4_Activated', diameter, 1)