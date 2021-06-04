// We expose just one global configuration object called "conf"
//
// There are a lot of parameters, and there is no way around that.  For
// example you say we can remove parameters by scaling, but that just
// exchanges a physical parameter for a scale parameter, and since the end
// audience are in need to physical parameters we will not lose parameters
// by doing that.  These are real physical things, not relative abstract
// things.  We keep these values so they can be used in both javaScript
// simulated devices, and in real USRP (Universal Software Radio
// Peripheral) hardware devices without FCC problems; so we hope.
//
// Don't get me wrong, I'm a big fan of parametric scaling of physical
// models, Reynolds number in fluid flow being the most famous example of
// scaling of physical models.  We could scale things like that here but
// since the end of this is presented to the user needs real physical
// parameters, and all of them, hence we don't scale the parameters.  We
// stick to unscaled measurable physical quantities.
//
// If you never studied dimensional analysis do it now:
// https://en.wikipedia.org/wiki/Dimensional_analysis.  There's a lot more
// to it than that, if you want to understand the scaling of physical
// models.
//
// Test example: under what conditions can a sine wave have all it's
// parameters scaled away: start with 3 parameters, A, w, a in S(t) = A
// sin(w t + a) where t is time, and scale them all away.
//

// This conf object defines all the signals that we can have to this
// thing.  The variables, keyed by: "freq", "bw", "gn", and "mcs" are
// setup in the Signal() object/function constructor like for example in:
//
//    var sig = Signal(conf.sig1);
//
//
// See Signal() below.
//
var conf = {
  // Modulation schemes that are available for all the signals.  The
  // "signal" (mcs) can pick one modulation scheme at a time via index
  // into this array, mcs = 0 to 11.
  schemes: [
    { rate: 0.5, SNR: 3.979, name: "r1/2 BPSK" }, //    0
    { rate: 0.66667, SNR: 5.703, name: "r2/3 BPSK" }, //    1
    { rate: 1.0, SNR: 7.109, name: "r1/2 QPSK" }, //    2
    { rate: 1.33333, SNR: 8.782, name: "r2/3 QPSK" }, //    3
    { rate: 1.77778, SNR: 10.202, name: "r8/9 QPSK" }, //    4
    { rate: 2.66667, SNR: 15.036, name: "r2/3 16-QAM" }, //    5
    { rate: 3.55556, SNR: 16.747, name: "r8/9 16-QAM" }, //    6
    { rate: 4.44444, SNR: 20.97, name: "r8/9 32-QAM" }, //    7
    { rate: 5.33333, SNR: 22.92, name: "r8/9 64-QAM" }, //    8
    { rate: 6.22222, SNR: 26.797, name: "r8/9 128-QAM" }, //   9
    { rate: 7.11111, SNR: 28.57, name: "r8/9 256-QAM" }, //  10
    { rate: 8.0, SNR: 31.05, name: "uncoded 256-QAM" }, //11
  ],

  // This signal (sig0) is from an old code that we started with but we
  // migrated away from.  We needed this to test/write this code.  See
  // sig1 for comments for these parameters.
  //
  // TODO: This case/signal can be removed, assuming this code works and
  // this case/signal is no longer in use.
  sig0: {
    mcs_init: 2,

    freq_min: 1780.0e6,
    freq_max: 1820.0e6,
    freq_plot_min: 1780.0e6,
    freq_plot_max: 1820.0e6,
    freq_step: 0.01e6,
    freq_init: 1800.0e6,

    bw_min: 4.0e6,
    bw_max: 40.0e6,
    bw_step: 0.01e6,
    bw_init: 8.0e6,

    gn_min: -30.0,
    gn_max: 0.0,
    gn_step: 0.01,
    gn_scale: 1.0,
    gn_init: 0.0,
  },

  // We figure there will not be more than 8 or so signals, so names
  // have one number digit in them, not two as in sig01.
  sig1: {
    // The parameters that are associated with signal 1, sig1, or
    // conf.sig1.
    //
    // It's not likely you can change one value and not change many
    // others.  There are a lot of natural constraint relations
    // between these parameter values.

    /////////////////////////////////////////////////////////////////
    //
    // Modulation Scheme - index into schemes[]
    //
    mcs_init: 1,
    //

    /////////////////////////////////////////////////////////////////
    // Center frequency constants in Hz.
    //
    // Min and max center frequency of this sig1 signal in Hz that the
    // user is allowed to set; be it changed by slider or user code.
    freq_min: 914.0e6,
    freq_max: 917.0e6,
    //
    // Power spectrum plot frequency limits that would be "good" for
    // this signal.  These 2 limits may need to be combined with other
    // signals like limits.  For example if we wish to show two
    // signals in the same power spectrum plot, we would need to find
    // the minimum of the freq_plot_min and the maximum of the
    // freq_plot_max of the two signals.
    freq_plot_min: 913.5e6,
    freq_plot_max: 917.5e6,
    //
    // The step size that we allow the user to change the sig1 center
    // frequency with the slider.
    freq_step: 0.01e6,
    // If the signal needed to be initialized, we let its center
    // frequency be initialized to this value.
    freq_init: 915.5e6,

    /////////////////////////////////////////////////////////////////
    // Signal bandwidth constants, measured in Hz.
    //
    // We let the user change the bandwidth between these two values;
    // be it changed by slider or user code.
    bw_min: 0.4e6,
    bw_max: 3.6e6,
    //
    // The step size that we allow the user to change the sig1
    // signal bandwidth with the slider.
    bw_step: 0.01e6,
    // initial bandwidth variable value
    bw_init: 1.0e6,

    /////////////////////////////////////////////////////////////////
    // Gain in dB
    //
    // We let the user change the gain between these two values;
    // be it changed by slider or user code.
    gn_min: 0.0,
    gn_max: 31.5,
    //
    // The step size that we allow the user to change the sig1 gain
    // with the slider.
    gn_step: 0.01,
    // gn_scale is used to display the value of the "gn" variable.
    gn_scale: 1.0,
    // initial gain variable value
    gn_init: 0.0,
  },
};

// We'll make sure we keep all conf data constant.
Object.freeze(conf.freeze);

// We keep a list of signal objects that are created.
Signal.objects = {};

//
// This function can create an object via "new" or without "new".
//
// Calling for example: "obj = new Signal(conf.sig1);" will create a new
// sig1 signal object, always.  Calling "obj = Signal(conf.sig1);" will
// return an existing "sig1" object if there is one, or make a new one if
// one does not exist yet.  It's kind of flexible that way...
//
// Recap: using new makes a new one always, just calling the function will
// return the same object if it has been created before.
//
//
//  sig:
//
//     is like conf.sig0, conf.sig1, conf.sig2 and etc ...
//     The "sig" argument is constant from the conf object above.

//
//  name:
//
//     is an optional prefix added to slider labels and plot labels.
//
function Signal(sig, name = "") {
  if (sig.freq_min === undefined) {
    alert("Signal(sig) sig is not a conf.sig object");
    stop();
    return;
  }

  if (this.document === undefined)
    // this is a new object, this function was called with new.
    // The user must know what they are doing.
    var obj = this;
  else {
    // this is NOT a new object, this function was called without new.
    if (Signal.objects[sig.id])
      // We already created a signal object with sig.
      return Signal.objects[sig.id];
    // Make the first and new Signal object from sig.
    var obj = new Object(); // Should be same as: obj = {};
    // Add to the list of Signal objects
    Signal.objects[sig.id] = obj;
  }

  // This is a new object with a new id.
  // We only get to here once per object, obj.
  obj.id = Signal.createCount++;

  // Label prefix, or the name we give the signal.
  obj.name = name;

  // Theses are just indexes into conf.schemes[]
  obj.mcs_min = 0;
  obj.mcs_max = conf.schemes.length - 1;
  obj.mcs_step = 1;

  // We copy the constant values in sig to this object.
  // It's just handy for the user.
  Object.keys(sig).forEach(function (key) {
    // this[key] does not work, but we can use obj[key] in its place.
    obj[key] = sig[key];
    // keep it as a constant.
    Object.freeze(obj[key]);
  });

  // _freq, _bw, and _gn are the dynamical variables that the user may
  // set or get using the setter and getter functions that we define
  // next.
  obj._freq = sig.freq_init; // same as obj['_freq'] = sig.freq_init
  obj._bw = sig.bw_init;
  obj._gn = sig.gn_init;
  obj._mcs = sig.mcs_init;

  // list of user callbacks that are called when one of the "values"
  // changes do a setter being set.  They start as empty arrays.
  obj._callbacks = { freq: [], bw: [], gn: [], mcs: [] };

  // Set up setters and getters for the three varying parameters,
  // "freq", "bw", "gn", and "mcs".
  //
  ["freq", "bw", "gn", "mcs"].forEach(function (key) {
    Object.defineProperty(obj, key, {
      // Define a parameter setter for this key.
      set: function (val) {
        if (isNaN(val)) return;

        //console.log("min=" + obj[key + '_min'] + " max=" + obj[key + '_max']);

        if (val < obj[key + "_min"]) val = obj[key + "_min"];
        else if (val > obj[key + "_max"]) val = obj[key + "_max"];
        if (obj["_" + key] === val)
          // No change, so we do nothing.
          return;

        //console.log("setting: " + obj.id + "." + key + "=" + val);
        obj["_" + key] = val;

        // Call any callbacks that the user set for this setter.
        obj._callbacks[key].forEach(function (callback) {
          //console.log("CALLING: " + callback);
          callback(obj, val);
        });
      },

      // Define a parameter getter for this key.
      get: function () {
        return obj["_" + key];
      },
    });
  });
  // Add a callback that is called when the value of "key" ("freq",
  // "bw", or "gn") changes.
  obj.addSetterCallback = function (key, callback) {
    if (typeof obj._callbacks[key] !== "undefined")
      obj._callbacks[key].push(callback);
  };

  obj.getBits = function (
    dt /*seconds*/,
    sigs
    /*array of other signals. Will filter out this.*/
  ) {
    // TODO: write this function.

    return 0.0;
  };

  if (this.document === undefined)
    // This was called with new.
    return;

  return obj;
}

Signal.createCount = 0;
