"use strict"; // A must for debugging code.

// TODO:
//
//   1. We need to find the axis vertical scale based on all the signals
//      gn_min and gn_max (and etc).
//
//   2. Optional HTML element to place the plot on, like in Slider() and
//      Label().  Now it just appends the plot at the end of the <body>.
//      This may be okay for all 15 starting exercises.
//

// This function does not expose/return any object or other functions.
// Yes, it's magic.
//
// Generates a Power Spectrum Plot with one or more signals that are in
// the environment Signal.env
//
//
// opts:  options object
//
//    yMax:  maximum y plot values in dB
//    yMin:  manimum y plot values in dB
///
//

var time = 1000;

function PowerSpectrumPlot(opts = {}) {
    var nfft = 2048;
    var margin = ({top: 50, right: 100, bottom: 40, left: 50})
    var height = 300
    var width = 750
    var x = d3.scaleLinear()
      .domain([0, nfft]) //REPLACE THIS WITH A PROPER FREQUENCY VALUE
      .range([margin.left, width - margin.right])
    const svg = d3.select("body").append("svg")
        .attr("style","background-color: black")
        .attr("viewBox", [0, 0, width, height])
        .attr("width",  plot.width  + plot.margin.left + plot.margin.right)
        .attr("height", plot.height + plot.margin.top +  plot.margin.bottom)
        .property("value", {x:x})
    if(typeof(opts.yMax) === 'undefined')
        opts.yMax = 20;
    if(typeof(opts.yMin) === 'undefined')
        opts.yMin = -60;

    var sigs = [];
    var noises = []; // We can only have one noise.

    var freq_plot_min = 1.0e32; // large number that we change
    var freq_plot_max = -1.0;   // small number that we change

    // We'll display spectrum from all signals in Signal.env;
    //
    Object.keys(Signal.env).forEach(function(key) {

        let sig = Signal.env[key];

        // Setup the plot to be updated when sig parameters change.

        if(sig.is_noise) {
            noises.push(sig);
            return;
        }

        // sig is not noise, so we add it to the list of signals.
        sigs.push(sig);

        // Get the limits freq_plot_min and freq_plot_max
        if(freq_plot_min > sig.freq_plot_min)
            freq_plot_min = sig.freq_plot_min;
        if(freq_plot_max < sig.freq_plot_max)
            freq_plot_max = sig.freq_plot_max;
    });


    // filter semi-length(m), over-sampling rate(k), total length
    const m = 80, // ! increasing this value squares off the signal
        k = 20,
        n = 2 * k * m + 1;
    var bw = 0.2, // bw
        gn = 0.0; // gain


    var generator = new siggen(nfft);
    generator.m = m;

    // determine time and frequency scale/units
    var [scale_freq, units_freq] = scale_units(
        sigs[0].freq_init + sigs[0].bw_max * 0.5,
        0.1
    ); // freq scale

    // 5. X scale will use the index of our data
    var fScale = d3
        .scaleLinear()
        .domain([freq_plot_min * scale_freq, freq_plot_max * scale_freq])
        .range([0, plot.width]);

    console.log(freq_plot_min * scale_freq, freq_plot_max * scale_freq);

    // 6. Y scale will use the randomly generate number
    var pScale = d3.scaleLinear().domain([opts.yMin, opts.yMax]).range([plot.height, 0]);

    const df = (freq_plot_max - freq_plot_min) / (nfft - 1);

    // 7. d3's line generator
    var linef = d3
        .line()
        .x(function (d, i) {
            return fScale((freq_plot_min + i * df) * scale_freq);
        }) // map frequency
        .y(function (d) {
            return pScale(d.y);
        }); // map PSD

    // 8. An array of objects of length N. Each object has key -> value
    // pair, the key being "y" and the value is a random number
    var dataf = d3.range(0, nfft - 1).map(function (f) {
        return { y: 0 };
    });

    // create SVG objects
    var svgf = svg_create(fScale, pScale, null); // ! null was formerly parentElement

    var labelPrefix = "";
    // TODO: This prefix label needs fixing so it works well for all the
    // signals in "sigs'
    //if(sigs[0].name.length > 0)
    //    labelPrefix = sigs[0].name + " ";
    // add labels
    svg_add_labels(
        svgf,
        labelPrefix + "Frequency (" + units_freq + "Hz)",
        labelPrefix + "Power Spectral Density (dB)"
    );

    // clip paths
    svgf
        .attr("style","display:none;")
        .append("clipPath")
        .attr("id", "clipf")
        .append("rect")
        .attr("width", plot.width)
        .attr("height", plot.height);

    // 9. Append the path, bind the data, and call the line generator
    var pathf = svgf
        .append("path")
        .attr("clip-path", "url(#clipf)")
        .datum(dataf)
        .attr("class", "stroke-med no-fill stroke-yellow")
        .attr("d", linef);

    function update_plot() {
        console.log(dataf);
        generator.clear();
        // Iterate through signal array, calc values and pass to generator
        sigs.forEach(function (sig) {
            let df = sig.freq_plot_max - sig.freq_plot_min;
            let fc = -0.5 + (sig.freq - sig.freq_plot_min) / df;
            let bw = sig.bw / df;
            let gn = sig.gn;

            //console.log("fc=" + fc + " bw=" + bw + " gn=" + gn);
            // ! bw (slider %) is limited to 90% range, as log(0) == inf
            generator.add_signal(fc, bw, gn + 10 * Math.log10(bw));
            //generator.add_signal(fc, bw, gn);
        });

        // use custom noise floor if given

        if(noises.length > 0) {
            let n_gn = 0.0; // total noise gain will be summed to n_gn.
            //
            // Having more than one noise is odd, but nothing says we can't.
            // We sum the noise gains this way:
            noises.forEach(function(noise) {
                // Sum the power.
                n_gn += Math.pow(10, noise.gn/10.0);
            });
            // Now make it be in dB.
            n_gn = 10 * Math.log10(n_gn);
            //
            // Note: if there was just one noise than n_gn is just that
            // one (noise.gn).
            generator.generate(n_gn);
        } else
            // else default noise floor is used (-120db, see generator src)
            generator.generate();

        dataf = d3.range(0, nfft - 1).map(function (i) {
            return { y: generator.psd[i] };
        });

        pathf.datum(dataf).attr("d", linef);
    }

    // Add the update_plot callback to all the signals callbacks.

    noises.forEach(function(noise) {
        noise.onChange("gn", update_plot);
    });

    sigs.forEach(function(sig) {
        // Setup the plot to be updated when sig parameters change.
        sig.onChange("freq", update_plot);
        sig.onChange("bw", update_plot);
        sig.onChange("gn", update_plot);
    });

    // update_plot() will be called by the callbacks that are set just
    // above.

    // time slider
    var time = 1000;
    var data = [0.1, 2];
    var time_slider = d3
        .sliderBottom()
        .min(d3.min(data))
        .max(d3.max(data))
        .width(600)
        .ticks(20)
        .step(0.1)
        .default(1)
        .on('onchange', function(d) {
            clearInterval(t_interval);
            t_interval = setInterval(draw, d * 1000);
        });

    var gSimple = d3
        .select('div#slider-simple')
        .append('svg')
        .attr('width', 800)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');

    gSimple.call(time_slider);
    // time slider ends

    // x offset slider
    var displace1 = 5
    var data_x_offset = [1, 15];
    var x_offset_slider = d3
        .sliderBottom()
        .min(d3.min(data_x_offset))
        .max(d3.max(data_x_offset))
        .width(600)
        .ticks(15)
        .step(1)
        .default(5)
        .on('onchange', function(d) {
            displace1 = d;
        });

    var g_x_slider = d3
        .select('div#slider-x-offset')
        .append('svg')
        .attr('width', 800)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');

        g_x_slider.call(x_offset_slider);
    // x offset slider ends

    // y offset slider
    var displace2 = -5
    var data_y_offset = [-1, -15];
    var y_offset_slider = d3
        .sliderBottom()
        .min(d3.min(data_y_offset))
        .max(d3.max(data_y_offset))
        .width(600)
        .ticks(15)
        .step(1)
        .default(5)
        .on('onchange', function(d) {
            displace2 = d;
        });

    var g_y_slider = d3
        .select('div#slider-y-offset')
        .append('svg')
        .attr('width', 800)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');

        g_y_slider.call(y_offset_slider);
    // y offset slider ends

    var y = d3.scaleLinear()
      .domain([-60,20])
      .range([height - margin.bottom, margin.top])
    var xAxis = (g, x) => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(x => (1780*(nfft-x)/nfft+1820*x/nfft).toFixed(0)))
    var yAxis = (g, y) => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
    var polyline = (data,x,y) => data.map((d,i) => x(i) + ',' + y(d)).join(' ')

    // giving offsets between current and historical graphs
    var changepos = (line) => {
      let arr = line.split(" ");
      for (let i = 0; i < arr.length; i++) {
        let nums = arr[i].split(",");
        nums[0] = parseFloat(nums[0]) + displace1;
        nums[1] = parseFloat(nums[1]) + displace2;
        arr[i] = (nums[0] + ',' + nums[1])
      }
      return arr.join(' ')
    }
    
    // maximum number of lines presented in the vis
    const maxlinesgenerated = 20;

    const line = svg.append("polyline")
        .attr("fill", "none")
        .attr("class", "stroke-med no-fill stroke-yellow")
        .attr("stroke-width", 1)
        .attr("style","opacity:1;")
        .attr("points", polyline(dataf.map(x => x['y']),x,y));

    const gx = svg.append("g")
        .call(xAxis, x);

    const gy = svg.append("g")
        .call(yAxis, y);

    svg.append("text")
        .attr("transform","translate("+(plot.width/2)+","+(plot.height + 0.75*plot.margin.bottom)+")")
        .attr("x", 60)
        .attr("dy","-0.3em")
        .style("text-anchor","middle")
	    .attr("fill", "white")
        .text("Frequency (" + units_freq + "Hz)");

    svg.append("text")
        .attr("transform","translate("+(plot.width/2)+","+(plot.height + 0.75*plot.margin.bottom)+")")
        .attr("y", -90)
        .attr("x", -40)
        .attr("dy", "1em")
        .style("text-anchor","middle")
        .attr("fill", "white")
        .attr("transform", "translate(100, 100) rotate(-90)")
        .text("Power Spectral Density (dB)");

    
    // tracking current number of line in the vis. can't surpass maxlinesgenerated
    var linescount = 0;

    function draw() {
      linescount++;
      if (linescount > maxlinesgenerated) {
        svg.select("polyline").remove();
        linescount--;
      }

      svg.selectAll("polyline").attr("points",function() { return changepos(d3.select(this).attr("points"));})
                               .attr("style",function() { return "opacity:" + (parseFloat(d3.select(this).attr("style").split(":")[1].split(";")[0]) - 1/maxlinesgenerated) + "; stroke: steelblue;"});

      svg.append("polyline")
          .attr("fill", "none")
          .attr("class", "stroke-med no-fill stroke-yellow")
          .attr("stroke-width", 1)
          .attr("style","opacity:1;")
          .attr("points", polyline(dataf.map(x => x['y']),x,y));
    }

    // draw every second
    var t_interval = setInterval(draw, time);
}
