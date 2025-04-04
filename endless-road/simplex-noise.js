/*
 * A fast javascript implementation of simplex noise by Jonas Wagner
 * based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 * This code was placed in the public domain by Jonas Wagner.
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 */
(function () {
  'use strict';
  
  var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  var F3 = 1.0 / 3.0;
  var G3 = 1.0 / 6.0;
  var F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
  var G4 = (5.0 - Math.sqrt(5.0)) / 20.0;
  
  function SimplexNoise(randomOrSeed) {
      var random;
      if (typeof randomOrSeed == 'function') {
          random = randomOrSeed;
      }
      else if (randomOrSeed) {
          random = alea(randomOrSeed);
      } else {
          random = Math.random;
      }
      this.p = buildPermutationTable(random);
      this.perm = new Uint8Array(512);
      this.permMod12 = new Uint8Array(512);
      for (var i = 0; i < 512; i++) {
          this.perm[i] = this.p[i & 255];
          this.permMod12[i] = this.perm[i] % 12;
      }
  
  }
  SimplexNoise.prototype = {
      grad3: new Float32Array([1, 1, 0,
          -1, 1, 0,
          1, -1, 0,
  
          -1, -1, 0,
          1, 0, 1,
          -1, 0, 1,
  
          1, 0, -1,
          -1, 0, -1,
          0, 1, 1,
  
          0, -1, 1,
          0, 1, -1,
          0, -1, -1]),
      grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
          0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
          1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
          -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
          1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
          -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
          1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
          -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0]),
      noise2D: function (xin, yin) {
          var permMod12 = this.permMod12;
          var perm = this.perm;
          var grad3 = this.grad3;
          var n0 = 0; // Noise contributions from the three corners
          var n1 = 0;
          var n2 = 0;
          // Skew the input space to determine which simplex cell we're in
          var s = (xin + yin) * F2; // Hairy factor for 2D
          var i = Math.floor(xin + s);
          var j = Math.floor(yin + s);
          var t = (i + j) * G2;
          var X0 = i - t; // Unskew the cell origin back to (x,y) space
          var Y0 = j - t;
          var x0 = xin - X0; // The x,y distances from the cell origin
          var y0 = yin - Y0;
          // For the 2D case, the simplex shape is an equilateral triangle.
          // Determine which simplex we are in.
          var i1, j1; // Offsets for second corner of simplex in (i,j) coords
          if (x0 > y0) {
              i1 = 1;
              j1 = 0;
          } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
          else {
              i1 = 0;
              j1 = 1;
          } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
          // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
          // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
          // c = (3-sqrt(3))/6
          var x1 = x0 - i1 + G2; // Offsets for second corner in (x,y) coords
          var y1 = y0 - j1 + G2;
          var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for third corner in (x,y) coords
          var y2 = y0 - 1.0 + 2.0 * G2;
          // Work out the hashed gradient indices of the three simplex corners
          var ii = i & 255;
          var jj = j & 255;
          // Calculate the contribution from the three corners
          var t0 = 0.5 - x0 * x0 - y0 * y0;
          if (t0 >= 0) {
              var gi0 = permMod12[ii + perm[jj]] * 3;
              t0 *= t0;
              n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
          }
          var t1 = 0.5 - x1 * x1 - y1 * y1;
          if (t1 >= 0) {
              var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
              t1 *= t1;
              n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
          }
          var t2 = 0.5 - x2 * x2 - y2 * y2;
          if (t2 >= 0) {
              var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
              t2 *= t2;
              n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
          }
          // Add contributions from each corner to get the final noise value.
          // The result is scaled to return values in the interval [-1,1].
          return 70.0 * (n0 + n1 + n2);
      },
      // 3D simplex noise
      noise3D: function (xin, yin, zin) {
          var permMod12 = this.permMod12;
          var perm = this.perm;
          var grad3 = this.grad3;
          var n0, n1, n2, n3; // Noise contributions from the four corners
          // Skew the input space to determine which simplex cell we're in
          var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
          var i = Math.floor(xin + s);
          var j = Math.floor(yin + s);
          var k = Math.floor(zin + s);
          var t = (i + j + k) * G3;
          var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
          var Y0 = j - t;
          var Z0 = k - t;
          var x0 = xin - X0; // The x,y,z distances from the cell origin
          var y0 = yin - Y0;
          var z0 = zin - Z0;
          // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
          // Determine which simplex we are in.
          var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
          var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
          if (x0 >= y0) {
              if (y0 >= z0) {
                  i1 = 1;
                  j1 = 0;
                  k1 = 0;
                  i2 = 1;
                  j2 = 1;
                  k2 = 0;
              } // X Y Z order
              else if (x0 >= z0) {
                  i1 = 1;
                  j1 = 0;
                  k1 = 0;
                  i2 = 1;
                  j2 = 0;
                  k2 = 1;
              } // X Z Y order
              else {
                  i1 = 0;
                  j1 = 0;
                  k1 = 1;
                  i2 = 1;
                  j2 = 0;
                  k2 = 1;
              } // Z X Y order
          }
          else { // x0<y0
              if (y0 < z0) {
                  i1 = 0;
                  j1 = 0;
                  k1 = 1;
                  i2 = 0;
                  j2 = 1;
                  k2 = 1;
              } // Z Y X order
              else if (x0 < z0) {
                  i1 = 0;
                  j1 = 1;
                  k1 = 0;
                  i2 = 0;
                  j2 = 1;
                  k2 = 1;
              } // Y Z X order
              else {
                  i1 = 0;
                  j1 = 1;
                  k1 = 0;
                  i2 = 1;
                  j2 = 1;
                  k2 = 0;
              } // Y X Z order
          }
          // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
          // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
          // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
          // c = 1/6.
          var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
          var y1 = y0 - j1 + G3;
          var z1 = z0 - k1 + G3;
          var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
          var y2 = y0 - j2 + 2.0 * G3;
          var z2 = z0 - k2 + 2.0 * G3;
          var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
          var y3 = y0 - 1.0 + 3.0 * G3;
          var z3 = z0 - 1.0 + 3.0 * G3;
          // Work out the hashed gradient indices of the four simplex corners
          var ii = i & 255;
          var jj = j & 255;
          var kk = k & 255;
          // Calculate the contribution from the four corners
          var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
          if (t0 < 0)
              n0 = 0.0;
          else {
              var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
              t0 *= t0;
              n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
          }
          var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
          if (t1 < 0)
              n1 = 0.0;
          else {
              var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
              t1 *= t1;
              n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
          }
          var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
          if (t2 < 0)
              n2 = 0.0;
          else {
              var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
              t2 *= t2;
              n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
          }
          var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
          if (t3 < 0)
              n3 = 0.0;
          else {
              var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
              t3 *= t3;
              n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
          }
          // Add contributions from each corner to get the final noise value.
          // The result is scaled to stay just inside [-1,1]
          return 32.0 * (n0 + n1 + n2 + n3);
      },
      // 4D simplex noise, better simplex rank ordering method 2012 Stefan Gustavson
      noise4D: function (x, y, z, w) {
          var permMod12 = this.permMod12;
          var perm = this.perm;
          var grad4 = this.grad4;
  
          var n0, n1, n2, n3, n4; // Noise contributions from the five corners
          // Skew the input space to determine which simplex cell we're in
          var s = (x + y + z + w) * F4; // Factor for 4D skewing
          var i = Math.floor(x + s);
          var j = Math.floor(y + s);
          var k = Math.floor(z + s);
          var l = Math.floor(w + s);
          var t = (i + j + k + l) * G4; // Factor for 4D unskewing
          var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
          var Y0 = j - t;
          var Z0 = k - t;
          var W0 = l - t;
          var x0 = x - X0; // The x,y,z,w distances from the cell origin
          var y0 = y - Y0;
          var z0 = z - Z0;
          var w0 = w - W0;
          // For the 4D case, the simplex is a 4D shape I won't even try to describe.
          // Determine which simplex we are in.
          var c = (x0 > y0) ? 32 : 0;
          if (x0 > z0) c |= 16;
          if (x0 > w0) c |= 8;
          if (y0 > z0) c |= 4;
          if (y0 > w0) c |= 2;
          if (z0 > w0) c |= 1;
          var i1, j1, k1, l1; // The integer offsets for the second simplex corner
          var i2, j2, k2, l2; // The integer offsets for the third simplex corner
          var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
          // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
          // Many values of c will never occur, since e.g. x>y>z>w makes x<z impossible.
          // Offsets for second corner in (i,j,k,l) coords
          i1 = simplex[c][0] >= 3 ? 1 : 0;
          j1 = simplex[c][1] >= 3 ? 1 : 0;
          k1 = simplex[c][2] >= 3 ? 1 : 0;
          l1 = simplex[c][3] >= 3 ? 1 : 0;
          // Offsets for third corner in (i,j,k,l) coords
          i2 = simplex[c][0] >= 2 ? 1 : 0;
          j2 = simplex[c][1] >= 2 ? 1 : 0;
          k2 = simplex[c][2] >= 2 ? 1 : 0;
          l2 = simplex[c][3] >= 2 ? 1 : 0;
          // Offsets for fourth corner in (i,j,k,l) coords
          i3 = simplex[c][0] >= 1 ? 1 : 0;
          j3 = simplex[c][1] >= 1 ? 1 : 0;
          k3 = simplex[c][2] >= 1 ? 1 : 0;
          l3 = simplex[c][3] >= 1 ? 1 : 0;
          // The fifth corner is (1,1,1,1) away from the origin in (i,j,k,l) coords
          // Offsets for second corner in (x,y,z,w) coords
          var x1 = x0 - i1 + G4;
          var y1 = y0 - j1 + G4;
          var z1 = z0 - k1 + G4;
          var w1 = w0 - l1 + G4;
          var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
          var y2 = y0 - j2 + 2.0 * G4;
          var z2 = z0 - k2 + 2.0 * G4;
          var w2 = w0 - l2 + 2.0 * G4;
          var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
          var y3 = y0 - j3 + 3.0 * G4;
          var z3 = z0 - k3 + 3.0 * G4;
          var w3 = w0 - l3 + 3.0 * G4;
          var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for fifth corner in (x,y,z,w) coords
          var y4 = y0 - 1.0 + 4.0 * G4;
          var z4 = z0 - 1.0 + 4.0 * G4;
          var w4 = w0 - 1.0 + 4.0 * G4;
          // Work out the hashed gradient indices of the five simplex corners
          var ii = i & 255;
          var jj = j & 255;
          var kk = k & 255;
          var ll = l & 255;
          // Calculate the contribution from the five corners
          var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
          if (t0 < 0) n0 = 0.0;
          else {
              var gi0 = perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32 * 4;
              t0 *= t0;
              n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
          }
          var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
          if (t1 < 0) n1 = 0.0;
          else {
              var gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32 * 4;
              t1 *= t1;
              n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
          }
          var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
          if (t2 < 0) n2 = 0.0;
          else {
              var gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32 * 4;
              t2 *= t2;
              n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
          }
          var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
          if (t3 < 0) n3 = 0.0;
          else {
              var gi3 = perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32 * 4;
              t3 *= t3;
              n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
          }
          var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
          if (t4 < 0) n4 = 0.0;
          else {
              var gi4 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32 * 4;
              t4 *= t4;
              n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
          }
          // Sum up and scale the result to cover the range [-1,1]
          return 27.0 * (n0 + n1 + n2 + n3 + n4);
      }
  };
  
  // Simplex vectors for 4D noise by Stefan Gustavson
  var simplex = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 0, 0, 0], [0, 2, 3, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 2, 3, 0],
      [0, 2, 1, 3], [0, 0, 0, 0], [0, 3, 1, 2], [0, 3, 2, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 3, 2, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [1, 2, 0, 3], [0, 0, 0, 0], [1, 3, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 3, 0, 1], [2, 3, 1, 0],
      [1, 0, 2, 3], [1, 0, 3, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 3, 1], [0, 0, 0, 0], [2, 1, 3, 0],
      [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
      [2, 0, 1, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 0, 1, 2], [3, 0, 2, 1], [0, 0, 0, 0], [3, 1, 2, 0],
      [2, 1, 0, 3], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [3, 1, 0, 2], [0, 0, 0, 0], [3, 2, 0, 1], [3, 2, 1, 0]
  ];
  
  function buildPermutationTable(random) {
      var i;
      var p = new Uint8Array(256);
      for (i = 0; i < 256; i++) {
          p[i] = i;
      }
      for (i = 0; i < 255; i++) {
          var r = i + ~~(random() * (256 - i));
          var aux = p[i];
          p[i] = p[r];
          p[r] = aux;
      }
      return p;
  }
  SimplexNoise._buildPermutationTable = buildPermutationTable;
  
  /*
  The ALEA PRNG and masher code used by simplex-noise.js
  is based on code by Johannes Baagøe <johannes.baagoe@gmail.com>.
  */
  function alea() {
    // Johannes Baagøe <johannes.baagoe@gmail.com>, 2010
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;
  
    var args = Array.prototype.slice.call(arguments);
    if (args.length == 0) {
      args = [+new Date];
    }
    var mash = masher();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');
  
    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(args[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(args[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;
    return function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
  }
  function masher() {
    var n = 0xefc8249d;
    return function(data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
  }
  
  // amd
  if (typeof define !== 'undefined' && define.amd) define(function(){return SimplexNoise;});
  // common js
  if (typeof exports !== 'undefined') exports.SimplexNoise = SimplexNoise;
  // browser
  else if (typeof window !== 'undefined') window.SimplexNoise = SimplexNoise;
  // nodejs
  if (typeof module !== 'undefined') {
      module.exports = SimplexNoise;
  }
  
  })();