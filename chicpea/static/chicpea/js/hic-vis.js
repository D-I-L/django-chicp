
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

var pi = Math.PI;

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
    var trackwidth = diameter * 0.05;
    var radius = r + ((parseFloat(adjScore) / adjMaxscore) * trackwidth);
    var startcoords = computeCartesian(radius, start, totalBP);
    return "translate(" + (startcoords.x + (diameter * 0.5)) + "," + (startcoords.y + (diameter * 0.5)) + ")";
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}




function renderHic(gene, tissue, diameter, breadcrumb) {
    resetPage(gene, tissue, breadcrumb)
    var trans = "translate(" + diameter * 0.5 + "," + diameter * 0.5 + ")";
    var maxscore = 0;
    //d3.json("/CHIC_DEMO2/cgi-bin/prototype.pl?gene=" + gene + '&tissue=' + tissue, function (error, json) {
    d3.json("/chicpea/search?gene=" + gene + '&tissue=' + tissue, function (error, json) {
        if (error) return console.warn(error);
        if (json.error) {
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
        //console.log(data);
        var genes = data.genes;
        var snps = data.snps;
        var meta = data.meta;
        //console.log(data.region);
        // compute max score
        //var maxscore = 0;
        for (var i = 0; i < snps.length; i++) {
            if (snps[i].score > maxscore) {
                maxscore = parseFloat(snps[i].score);
            }
        }
        //console.log(snps);
        d3.select("#message").remove();
        var hics = data.hic;
        if (hics.length == 0) {
            div = d3.select("#svg-container")
                .append("div")
                .html("<h1>No interactions found</h1>")
                .attr("id", "message")
                .style("width", "100%")
                .style("text-align", "center")
                .style("padding-top", "200px");
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
        var totalBP = data.meta.rend - data.meta.rstart;
        var vis = d3.select("#svg-container").append("svg").attr("id", "main-svg").attr("width", diameter).attr("height", diameter);
        //var diameter = 500;
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

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


        //add gene track

        vis.append("g").attr("class", "track genes").selectAll("svg")
            .data(genes)
            .enter()
            .append("path")
            .attr("d", function (d) {
				return (computeStrandPath(d.start, d.end, (diameter * 0.35) + (d.bumpLevel * 15), totalBP));
			})
            .attr("transform", trans)
            .attr("class", function (d) {
            		if (d.gene_name == $("#gene").val().toUpperCase()) {
            			return "hilight";
            		} else {
            			return d.gene_biotype;
            		}
            })
            .attr("marker-start", function (d) {
				var bt = d.gene_biotype;
				if (d.gene_name == $("#gene").val().toUpperCase()) {
					bt = 'hilight';
				}
				if (d.strand == "-") return ("url(#lharrow_" + bt + ")");
			})
            .attr("marker-end", function (d) {
				var bt = d.gene_biotype;
				if (d.gene_name == $("#gene").val().toUpperCase()) {
					bt = 'hilight';
				}
				if (d.strand == "+") return ("url(#rharrow_" + bt + ")");
			})
            .on("click", function (d) {
            console.log("Mouse Click !" + d.gene_name);
            $("#gene").val(d.gene_name);
            var gene = $("#gene").val().toUpperCase();
            div.transition()
                .duration(500)
                .style("opacity", 0);
            d3.selectAll("svg").remove();
            renderHic(gene, tissue, diameter, 1);
            return false;
        })
            .on("mouseover", function (d, i) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9);
            div.html(d.gene_name + "</br>" + d.gene_biotype + "</br>" + d.gene_id + "</br>" + numberWithCommas(parseInt(d.start) + parseInt(meta.ostart)) + "</br>" + numberWithCommas(parseInt(d.end) + parseInt(meta.ostart)))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            d3.select(this).style("opacity", 0.3);
        })
            .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            d3.select(this).style("opacity", 1);
        })


        // add hic links


        var color = d3.scale.linear()
            .domain([5, 20])
            .range(["blue", "red"]);
        
        var score = 5;

        vis.append("g").attr("class", "middle hic").selectAll("svg")
        //.data(hics.filter(function(d){ return parseFloat(d[tissue]) >= score; }))
        .data(hics)
            .enter()
            .append("path")
            .attr("id", function (d, i) {
            return ('p' + i);
        })
            //.attr("class", "interaction")
            .attr("class", function(d){
            		classes = "interaction";
            		for (var i=0;i<meta.tissues.length;i++) {
            			if (parseFloat(d[meta.tissues[i]]) >= score){
            				classes += " "+meta.tissues[i];
            			}
            		}
            		return classes;
            })
            .attr("display", "none")
            //.attr("style", "display:none")
            .attr("d", function (d) {
            //return computePath(d.baitStart,d.oeEnd,150,data.meta.rend - data.meta.rstart);
            return computePath(d.baitStart + ((d.baitEnd - d.baitStart) / 2), d.oeStart + ((d.oeEnd - d.oeStart) / 2), diameter * 0.28, totalBP, diameter);
        })
            .attr("transform", trans)
            .attr("fill", "none")
            .attr("stroke", function (d) {
            //return 'green';
            //return color(d.B23_CD4_Naive_D3_4)
            tissue = $("input:radio[name=tissue]:checked").val();
            return color(d[tissue]);
        })
            .attr("stroke-width", 3)
            .on("mouseover", function (d, i) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9);
            //div.html("HicCup score " + parseFloat(d.tissue[tissue]).toFixed(2) + "</br>Bait: " + d.baitStart + " " + d.baitEnd + "</br>Target: " + d.oeStart + " " + d.oeEnd)
            var bStart = numberWithCommas(d.baitStart + parseInt(meta.ostart));
            var bEnd = numberWithCommas(d.baitEnd + parseInt(meta.ostart));
            var tStart = numberWithCommas(d.oeStart + parseInt(meta.ostart));
            var tEnd = numberWithCommas(d.oeEnd + parseInt(meta.ostart));
            div.html("Bait: " + bStart + '-' + bEnd + "</br>Target: " + tStart + '-' + tEnd)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            // have a zscore issue
            // tried to use 'use' that doesn't work !
            // this approach is simple but does not help with 
            vis.select('#p' + i)
                .attr("stroke", "yellow")
                //.style("stroke-width", "10")
                .attr("stroke-width", 6);

            // try sort approach from stackexchange http://stackoverflow.com/questions/13595175/updating-svg-element-z-index-with-d3

            vis.selectAll("path.interaction").sort(function (a, b) { // select the parent and sort the path's
            		//console.log(a)
            		//console.log(b)
                if (a.id != d.id) return -1; // a is not the hovered element, send "a" to the back
                else return 1; // a is the hovered element, bring "a" to the front
            });
            
            vis.select("#path").selectAll(".deleteClick");

            vis.append("path")
                .attr("class", "deleteMe")
                .attr("d", computeArcPath(d.oeStart, d.oeEnd, diameter * 0.28, diameter / 2, totalBP))
                .style("stroke-width", 1)
                .style("stroke", "red")
                .attr("transform", trans)
                .attr("fill", "none")

            vis.append("path")
                .attr("class", "deleteMe")
                .attr("d", computeArcPath(d.baitStart, d.baitEnd, diameter * 0.28, diameter / 2, totalBP))
                .style("stroke-width", 1)
                .style("stroke", "blue")
                .attr("transform", trans)
                .attr("fill", "none")


        })
            .on("mouseout", function (d, i) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            vis.select('#p' + i)
            	.attr("stroke", function (d) {
					tissue = $("input:radio[name=tissue]:checked").val();
					return color(d[tissue]);
				})
            .attr("stroke-width", 3);
                //.style("stroke", "green")
                //.style("stroke-width", "4");
            vis.selectAll(".deleteMe").remove();

        })
            .on("click", function (d, i) {
            		vis.selectAll(".deleteClick").remove();
            		vis.selectAll(".updateClick").classed('updateClick', false);
            		
            		$(".deleteMe").attr('class', 'deleteClick');
            		vis.select('#p' + i).classed('updateClick', true).style("stroke", "yellow").style("stroke-width", "10");
            		
					d3.select("#bait-svg").remove();
					d3.select("#target-svg").remove();
					$("#footer-bait").html("&nbsp;");
					$("#footer-target").html("&nbsp;");
					$("#footer-bait").html('chr' + meta.rchr + ':' + numberWithCommas(d.baitStart + parseInt(meta.ostart)) + '..' + numberWithCommas(d.baitEnd + parseInt(meta.ostart)) + " (" + ((d.baitEnd - d.baitStart) / 1000).toFixed(2) + "KB)");
					$("#footer-target").html('chr' + meta.rchr + ':' + numberWithCommas(d.oeStart + parseInt(meta.ostart)) + '..' + numberWithCommas(d.oeEnd + parseInt(meta.ostart)) + " (" + ((d.oeEnd - d.oeStart) / 1000).toFixed(2) + "KB)");
					
					drawRegionPanel("bait", meta.rchr, (d.baitStart + parseInt(meta.ostart)), (d.baitEnd + parseInt(meta.ostart)), maxscore);
					drawRegionPanel("target", meta.rchr, (d.oeStart + parseInt(meta.ostart)), (d.oeEnd + parseInt(meta.ostart)), maxscore);
        });

        function log10(val) {
            return Math.log(val) / Math.LN10;
        }
        var thresh = -1 * log10(1e-1);
        //var thresh = -1 * log10(1e-5);
        var symb = d3.svg.symbol();
        symb.size(10);
        vis.append("g").attr("class", "track snps").selectAll("svg")
            .data(snps.filter(function (d) {
            return parseFloat(d.score) >= thresh;
        }))
            .enter()
            .append("path")
            .attr("transform", function (d) {
            //console.log(d);
            return (computePointPath(d.start, d.end, d.score, thresh, maxscore, diameter * 0.29, totalBP, diameter))
        })
            .attr("d", symb)
            .attr("stroke", function (d) {
            if (parseFloat(d.score) == maxscore) return "red";
            return "black";
        })
            .attr("fill", function (d) {
            if (parseFloat(d.score) == maxscore) return "red";
            return "black";
        })
            .on("mouseover", function (d, i) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9);
            div.html(d.Name + "</br>" + d.score + "</br>" + numberWithCommas(parseInt(d.start) + parseInt(meta.rstart)) + "</br>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            d3.select(this).style("opacity", 0.3);
        })
            .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            d3.select(this).style("opacity", 1);
        });

        vis.selectAll("svg")
            .data([1])
            .enter()

            .append("path")
        //.attr("d",computeArcPath(1,totalBP, diameter*0.2, diameter*0.1,  totalBP))
        .attr("d", computeStrandPath(1, totalBP, diameter * 0.35, totalBP, "0,0"))
            .style("stroke-width", 60)
            .style("stroke", "lightgrey")
            .attr("transform", trans)
            .attr("fill", "none");
        // end of JSON call
        vis.selectAll("path.interaction."+tissue).attr("display", "inline");  
    });
}

function drawRegionPanel(type, chr, start, end, maxscore) {	
	var region = chr+':'+start+'-'+end,
		data1 = [start, end],
		w = 700, h = 270, trackHeight = 90,
		margin = {top: 10, right: 10, bottom: 10, left: 10},
		formatxAxis = d3.format('0,000,000f'),
		xRange = d3.scale.linear().domain([d3.min(data1), d3.max(data1)]).range([(3 * margin.left), (w - margin.left)]),
		regionStart = d3.min(data1),
		tissue = $("input:radio[name=tissue]:checked").val();
		
	var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
		
	d3.json("/chicpea/search?region=" + region + '&tissue=' + tissue, function (error, data) {
			if (error) return console.warn(error);
			
			//console.log(data);
			adjustBump(data.genes, 100);	
			
			//Create the SVG Viewport
			var svgContainer = d3.select("#panel-" + type).append("svg:svg")
				.attr("width", w)
				.attr("height", h)
				.attr("id", type + "-svg");
			
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
				
			var snp = svgContainer.append("g").attr("class", "track snps").attr("id", type+"SNPTrack")
				.selectAll(".snp")
				.data(data.snps)
				.enter().append("g")
				.attr("class", "snp");		
			
			snp.append("path")
				.attr("class", "marker")
				.attr("d", d3.svg.symbol().size(30))
				.attr("stroke", function (d) {
					if (parseFloat(d.score) == maxscore) return "red";
					if (parseFloat(d.score) >= 7.03) return "green";
					return "lightgrey";
				})
				.attr("fill", function (d) {
					if (parseFloat(d.score) == maxscore) return "red";
					if (parseFloat(d.score) >= 7.03) return "green";
					return "lightgrey";
				})
				.attr("transform", function (d) {
					return "translate(" + xRange(d.start + regionStart) + "," + yRangeS(d.score) + ")";
				})
				.on("mouseover", function (d, i) {
						div.transition()
							.duration(200)
							.style("opacity", 0.9);
						div.html(d.Name + "</br>" + d3.round(d.score, 3) + "</br>" + numberWithCommas(parseInt(d.start) + parseInt(regionStart)))
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
				
			// TRACK 2 - GENES
			var yRangeG = d3.scale.linear().domain([0, trackHeight]).range([margin.top, margin.top + trackHeight]);
			var geneTrackOffset = trackHeight + (margin.top);
				
			var gene = svgContainer.append("g").attr("class", "track genes").attr("id", type+"GeneTrack")
				.selectAll(".gene")
				.data(data.genes)
				.enter().append("g")
				.attr("class", "gene");
				
				var lineFunction = d3.svg.line()
					.x(function (d) {
					return d.x;
				})
					.y(function (d) {
					return d.y;
				})
					.interpolate("linear");
				
				gene.append("path")
					.attr("class", function (d) {
					return "line "+d.gene_biotype;
				})
					.attr("d", function (d) {
					if (d.strand == "-") {
						return lineFunction([{
							x: xRange(d.end + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}, {
							x: xRange(d.start + regionStart) + 5,
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}, {
							x: xRange(d.start + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 6
						}, {
							x: xRange(d.start + regionStart) + 5,
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 12
						}, {
							x: xRange(d.end + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 12
						}, {
							x: xRange(d.end + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}])
					} else {
						return lineFunction([{
							x: xRange(d.start + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}, {
							x: xRange(d.start + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 12
						}, {
							x: xRange(d.end + regionStart) - 5,
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 12
						}, {
							x: xRange(d.end + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel)) + 6
						}, {
							x: xRange(d.end + regionStart) - 5,
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}, {
							x: xRange(d.start + regionStart),
							y: geneTrackOffset + yRangeG((30 * d.bumpLevel))
						}])
					}
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
				
				var blueprint = blueprintTrack.append("g").attr("class", sample).selectAll(".blueprint")
					.data(data.blueprint[sample])
					.enter(); 
				
				/*var blueprint = svgContainer.append("g").attr("class", "track blueprint "+sample).selectAll(".blueprint")
					.data(data.blueprint[sample])
					.enter(); //.append("g");
					//.attr("class", "blueprint");*/
				
				blueprint.append("path")
					.attr("class", "line")
					.attr("d", function (d) {
							return line([ { x: d.start, y: trackOffset}, { x: d.end, y: trackOffset }]);
					})
					.attr("stroke", function (d) { return "rgb("+d.color+")"; })
					.attr("stroke-width", "6px")
					.on("mouseover", function (d, i) {
							div.transition()
								.duration(200)
								.style("opacity", 0.9);
							div.html("<strong>"+d.sample+"</strong><br/>"+d.name)
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
			}
			
	});	
}

function resetPage(gene, tissue, breadcrumb) {
    d3.selectAll("svg").remove();
    $("#gene").val(gene);
    $("#page_header").html(gene + " in " + tissue.replace(/_/g, " ") + " Tissues");
    $("#footer-bait").html("&nbsp;");
    $("#footer-target").html("&nbsp;");
    if (breadcrumb) $("#breadcrumb").append('<li id="BC-' + gene + '"><a href="#" onclick=\'javascript:d3.selectAll("svg").remove(); $("#BC-' + gene + '").remove(); renderHic("' + gene + '", $("input:radio[name=tissue]:checked").val(), 750, 1)\'>' + gene + '</a></li>');
}

$(document).ready(function () {
    $("#pushme").bind("click", function () {
    		var tissue = $("input:radio[name=tissue]:checked").val();
    		var diameter = 750;
    		var gene = $("#gene").val().toUpperCase();
    		renderHic(gene, tissue, diameter, 1)
    		return (false);
    });

    $("input:radio[name=tissue]").bind("click", function () {
    		var tissue = $("input:radio[name=tissue]:checked").val();
    		var gene = $("#gene").val().toUpperCase();
    		$("#page_header").html(gene + " in " + tissue.replace(/_/g, " ") + " Tissues");
    		
    		d3.select("#svg-container").selectAll(".deleteClick").remove();
    		d3.select("#svg-container").selectAll(".updateClick").classed('updateClick', false);
    		d3.select("#bait-svg").remove();
    		d3.select("#target-svg").remove();
			$("#footer-bait").html("&nbsp;");
			$("#footer-target").html("&nbsp;");
    		d3.select("#svg-container").selectAll("path.interaction").attr("display", "none");
    		
    		if (d3.select("#svg-container").selectAll("path.interaction."+tissue)[0].length == 0){
    			console.log("No Interactions found....");
    		}
    		else{
    			d3.select("#svg-container").selectAll("path.interaction."+tissue).attr("display", "inline");
    		}
    });
});

var geneParam = getQueryVariable("gene");
if (geneParam == undefined){ geneParam = 'IL2RA'; }
renderHic(geneParam, 'Total_CD4_Activated', 750, 1)