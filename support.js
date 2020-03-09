function svg_create(_margin, _width, _height, _xscale, _yscale)
{
    // 1. Add the SVG (time) to the page and employ #2
    var svg = d3.select("body").append("svg")
        .attr("width",  _width  + _margin.left + _margin.right)
        .attr("height", _height + _margin.top +  _margin.bottom)
      .append("g")
        .attr("transform", "translate(" + _margin.left + "," + _margin.top + ")");

    // create axes
    svg.append("g").attr("class", "x axis")
        .attr("transform", "translate(0," + _height + ")")
        .call(d3.axisBottom(_xscale));
    svg.append("g").attr("class", "y axis")
        .call(d3.axisLeft(_yscale));

    // create grid lines
    svg.append("g").attr("class","grid").call(d3.axisBottom(_xscale).tickFormat("").tickSize( _height));
    svg.append("g").attr("class","grid").call(d3.axisLeft  (_yscale).tickFormat("").tickSize(- _width));
    return svg;
}

function svg_add_labels(_svg, _margin, _width, _height, _xlabel, _ylabel)
{
    // create x-axis axis label
    _svg.append("text")
       .attr("transform","translate("+(_width/2)+","+(_height + 0.75*_margin.bottom)+")")
       .attr("dy","-0.3em")
       .style("text-anchor","middle")
       .text(_xlabel)

    // create y-axis label
    _svg.append("text")
       .attr("transform","rotate(-90)")
       .attr("y", 0 - _margin.left)
       .attr("x", 0 - (_height/2))
       .attr("dy", "1em")
       .style("text-anchor","middle")
       .text(_ylabel)
}

// normal random number
function randn()
{
    let u1 = 0, u2 = Math.random();
    while (u1 == 0) { u1 = Math.random(); }
    return Math.sqrt(-2*Math.log(u1)) * Math.sin(2*Math.PI*u2);
}

// function class to generate signals, power spectral density
function siggen(nfft)
{
    this.nfft = nfft;
    this.fft  = new FFTNayuki(nfft);
    this.xi   = new Array(nfft);
    this.xq   = new Array(nfft);
    this.psd  = new Array(nfft);
    this.m    = Math.min(120,Math.floor(0.4*nfft)); // filter semi-length

    // clear internal buffer
    this.clear = function() {
        for (var i=0; i<this.nfft; i++) {
            this.xi[i] = 0;
            this.xq[i] = 0;
        }
    }

    // generate signals in the time-domain buffer
    this.add_signal = function(_fc, _bw, _gain) {
        let gain = Math.pow(10,_gain/20);
        for (var i=0; i<2*this.m+1; i++) {
            let v = Math.max(0.0001,Math.abs(Math.PI*_bw*(i-this.m)));
            let w = Math.cos(0.5*Math.PI*(i-this.m)/this.m)**4;
            let h = Math.sin(v) / v * w;
            this.xi[i] += gain * Math.cos(2*Math.PI*_fc*i) * h;
            this.xq[i] += gain * Math.sin(2*Math.PI*_fc*i) * h;
        }
    }

    // add noise to time-domain buffer
    this.add_noise = function(noise_floor_dB) {
        // compute noise standard deviation, compensating for fft size and I/Q components
        let nstd = Math.pow(10.,noise_floor_dB/20) / Math.sqrt(2 * this.nfft);
        for (var i=0; i<this.nfft; i++) {
            this.xi[i] += randn() * nstd;
            this.xq[i] += randn() * nstd;
        }
    }

    // run fft, adding noise floor as appropriate
    this.generate = function(noise_floor_dB) {
        // compute noise floor (minimum prevents possibility of log of zero)
        if (noise_floor_dB==null)
            { noise_floor_dB = -120; }
        let noise_floor = Math.min(1e-12, Math.pow(10.,noise_floor_dB/10));

        // compute transform in place
        this.fft.forward(this.xi,this.xq);

        // convert to dB (adding noise floor as appropriate), and apply fft shift
        for (var i=0; i<this.nfft; i++) {
            let x2 = this.xi[i]**2 + this.xq[i]**2;
            this.psd[(i+this.nfft/2)%nfft] = 10*Math.log10(noise_floor + x2);
        }
    }
}

