import { AlphaFormat, ArrayCamera, BoxGeometry, BufferAttribute, BufferGeometry, ByteType, ClampToEdgeWrapping, Color, ColorManagement, CubeCamera, CubeDepthTexture, CubeTexture, Data3DTexture, DataArrayTexture, DataTexture, DepthFormat, DepthStencilFormat, DepthTexture, EventDispatcher, ExternalTexture, Float32BufferAttribute, FloatType, Frustum, GLSL3, HalfFloatType, IntType, Layers, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, LinearTransfer, Matrix3, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshDistanceMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, OrthographicCamera, PerspectiveCamera, Plane, PlaneGeometry, R11_EAC_Format, RAD2DEG, RED_GREEN_RGTC2_Format, RED_RGTC1_Format, RG11_EAC_Format, RGBAFormat, RGBAIntegerFormat, RGBA_ASTC_10x10_Format, RGBA_ASTC_10x5_Format, RGBA_ASTC_10x6_Format, RGBA_ASTC_10x8_Format, RGBA_ASTC_12x10_Format, RGBA_ASTC_12x12_Format, RGBA_ASTC_4x4_Format, RGBA_ASTC_5x4_Format, RGBA_ASTC_5x5_Format, RGBA_ASTC_6x5_Format, RGBA_ASTC_6x6_Format, RGBA_ASTC_8x5_Format, RGBA_ASTC_8x6_Format, RGBA_ASTC_8x8_Format, RGBA_BPTC_Format, RGBA_ETC2_EAC_Format, RGBA_PVRTC_2BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGBFormat, RGB_BPTC_SIGNED_Format, RGB_BPTC_UNSIGNED_Format, RGB_ETC1_Format, RGB_ETC2_Format, RGB_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGB_S3TC_DXT1_Format, RGFormat, RGIntegerFormat, RawShaderMaterial, RedFormat, RedIntegerFormat, RepeatWrapping, ReversedDepthFuncs, SIGNED_R11_EAC_Format, SIGNED_RED_GREEN_RGTC2_Format, SIGNED_RED_RGTC1_Format, SIGNED_RG11_EAC_Format, SRGBColorSpace, SRGBTransfer, ShaderMaterial, ShortType, Texture, Uint16BufferAttribute, Uint32BufferAttribute, UniformsUtils, UnsignedByteType, UnsignedInt101111Type, UnsignedInt248Type, UnsignedInt5999Type, UnsignedIntType, UnsignedShort4444Type, UnsignedShort5551Type, UnsignedShortType, Vector2, Vector3, Vector4, WebGLCoordinateSystem, WebGLRenderTarget, WebXRController, cloneUniforms, createCanvasElement, createElementNS, error, getByteLength, getUnlitUniformColorSpace, log, mergeUniforms, probeAsync, warn, warnOnce } from "./three.core.js?v=q9f7JKE-";
//#region node_modules/three/build/three.module.js
/**
* @license
* Copyright 2010-2026 Three.js Authors
* SPDX-License-Identifier: MIT
*/
function WebGLAnimation() {
	let context = null;
	let isAnimating = false;
	let animationLoop = null;
	let requestId = null;
	function onAnimationFrame(time, frame) {
		requestId = context.requestAnimationFrame(onAnimationFrame);
		animationLoop(time, frame);
	}
	return {
		start: function() {
			if (isAnimating === true) return;
			if (animationLoop === null) return;
			if (context === null) return;
			requestId = context.requestAnimationFrame(onAnimationFrame);
			isAnimating = true;
		},
		stop: function() {
			if (context !== null) context.cancelAnimationFrame(requestId);
			isAnimating = false;
		},
		setAnimationLoop: function(callback) {
			animationLoop = callback;
		},
		setContext: function(value) {
			context = value;
		}
	};
}
function WebGLAttributes(gl) {
	const buffers = /* @__PURE__ */ new WeakMap();
	function createBuffer(attribute, bufferType) {
		const array = attribute.array;
		const usage = attribute.usage;
		const size = array.byteLength;
		const buffer = gl.createBuffer();
		gl.bindBuffer(bufferType, buffer);
		gl.bufferData(bufferType, array, usage);
		attribute.onUploadCallback();
		let type;
		if (array instanceof Float32Array) type = gl.FLOAT;
		else if (typeof Float16Array !== "undefined" && array instanceof Float16Array) type = gl.HALF_FLOAT;
		else if (array instanceof Uint16Array) {
			if (attribute.isFloat16BufferAttribute) type = gl.HALF_FLOAT;
			else type = gl.UNSIGNED_SHORT;
		} else if (array instanceof Int16Array) type = gl.SHORT;
		else if (array instanceof Uint32Array) type = gl.UNSIGNED_INT;
		else if (array instanceof Int32Array) type = gl.INT;
		else if (array instanceof Int8Array) type = gl.BYTE;
		else if (array instanceof Uint8Array) type = gl.UNSIGNED_BYTE;
		else if (array instanceof Uint8ClampedArray) type = gl.UNSIGNED_BYTE;
		else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: " + array);
		return {
			buffer,
			type,
			bytesPerElement: array.BYTES_PER_ELEMENT,
			version: attribute.version,
			size
		};
	}
	function updateBuffer(buffer, attribute, bufferType) {
		const array = attribute.array;
		const updateRanges = attribute.updateRanges;
		gl.bindBuffer(bufferType, buffer);
		if (updateRanges.length === 0) gl.bufferSubData(bufferType, 0, array);
		else {
			updateRanges.sort((a, b) => a.start - b.start);
			let mergeIndex = 0;
			for (let i = 1; i < updateRanges.length; i++) {
				const previousRange = updateRanges[mergeIndex];
				const range = updateRanges[i];
				if (range.start <= previousRange.start + previousRange.count + 1) previousRange.count = Math.max(previousRange.count, range.start + range.count - previousRange.start);
				else {
					++mergeIndex;
					updateRanges[mergeIndex] = range;
				}
			}
			updateRanges.length = mergeIndex + 1;
			for (let i = 0, l = updateRanges.length; i < l; i++) {
				const range = updateRanges[i];
				gl.bufferSubData(bufferType, range.start * array.BYTES_PER_ELEMENT, array, range.start, range.count);
			}
			attribute.clearUpdateRanges();
		}
		attribute.onUploadCallback();
	}
	function get(attribute) {
		if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;
		return buffers.get(attribute);
	}
	function remove(attribute) {
		if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;
		const data = buffers.get(attribute);
		if (data) {
			gl.deleteBuffer(data.buffer);
			buffers.delete(attribute);
		}
	}
	function update(attribute, bufferType) {
		if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;
		if (attribute.isGLBufferAttribute) {
			const cached = buffers.get(attribute);
			if (!cached || cached.version < attribute.version) buffers.set(attribute, {
				buffer: attribute.buffer,
				type: attribute.type,
				bytesPerElement: attribute.elementSize,
				version: attribute.version
			});
			return;
		}
		const data = buffers.get(attribute);
		if (data === void 0) buffers.set(attribute, createBuffer(attribute, bufferType));
		else if (data.version < attribute.version) {
			if (data.size !== attribute.array.byteLength) throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
			updateBuffer(data.buffer, attribute, bufferType);
			data.version = attribute.version;
		}
	}
	return {
		get,
		remove,
		update
	};
}
var ShaderChunk = {
	alphahash_fragment: "#ifdef USE_ALPHAHASH\n	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n#endif",
	alphahash_pars_fragment: "#ifdef USE_ALPHAHASH\n	const float ALPHA_HASH_SCALE = 0.05;\n	float hash2D( vec2 value ) {\n		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );\n	}\n	float hash3D( vec3 value ) {\n		return hash2D( vec2( hash2D( value.xy ), value.z ) );\n	}\n	float getAlphaHashThreshold( vec3 position ) {\n		float maxDeriv = max(\n			length( dFdx( position.xyz ) ),\n			length( dFdy( position.xyz ) )\n		);\n		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );\n		vec2 pixScales = vec2(\n			exp2( floor( log2( pixScale ) ) ),\n			exp2( ceil( log2( pixScale ) ) )\n		);\n		vec2 alpha = vec2(\n			hash3D( floor( pixScales.x * position.xyz ) ),\n			hash3D( floor( pixScales.y * position.xyz ) )\n		);\n		float lerpFactor = fract( log2( pixScale ) );\n		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;\n		float a = min( lerpFactor, 1.0 - lerpFactor );\n		vec3 cases = vec3(\n			x * x / ( 2.0 * a * ( 1.0 - a ) ),\n			( x - 0.5 * a ) / ( 1.0 - a ),\n			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )\n		);\n		float threshold = ( x < ( 1.0 - a ) )\n			? ( ( x < a ) ? cases.x : cases.y )\n			: cases.z;\n		return clamp( threshold , 1.0e-6, 1.0 );\n	}\n#endif",
	alphamap_fragment: "#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n#endif",
	alphamap_pars_fragment: "#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	alphatest_fragment: "#ifdef USE_ALPHATEST\n	#ifdef ALPHA_TO_COVERAGE\n	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n	if ( diffuseColor.a == 0.0 ) discard;\n	#else\n	if ( diffuseColor.a < alphaTest ) discard;\n	#endif\n#endif",
	alphatest_pars_fragment: "#ifdef USE_ALPHATEST\n	uniform float alphaTest;\n#endif",
	aomap_fragment: "#ifdef USE_AOMAP\n	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;\n	reflectedLight.indirectDiffuse *= ambientOcclusion;\n	#if defined( USE_CLEARCOAT ) \n		clearcoatSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_SHEEN ) \n		sheenSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD )\n		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );\n		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );\n	#endif\n#endif",
	aomap_pars_fragment: "#ifdef USE_AOMAP\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n#endif",
	batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#define gl_DrawID _gl_DrawID\n	uniform int _gl_DrawID;\n	#endif\n	uniform highp sampler2D batchingTexture;\n	uniform highp usampler2D batchingIdTexture;\n	mat4 getBatchingMatrix( const in float i ) {\n		int size = textureSize( batchingTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n	float getIndirectIndex( const in int i ) {\n		int size = textureSize( batchingIdTexture, 0 ).x;\n		int x = i % size;\n		int y = i / size;\n		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );\n	}\n#endif\n#ifdef USE_BATCHING_COLOR\n	uniform sampler2D batchingColorTexture;\n	vec4 getBatchingColor( const in float i ) {\n		int size = textureSize( batchingColorTexture, 0 ).x;\n		int j = int( i );\n		int x = j % size;\n		int y = j / size;\n		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );\n	}\n#endif",
	batching_vertex: "#ifdef USE_BATCHING\n	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif",
	begin_vertex: "vec3 transformed = vec3( position );\n#ifdef USE_ALPHAHASH\n	vPosition = vec3( position );\n#endif",
	beginnormal_vertex: "vec3 objectNormal = vec3( normal );\n#ifdef USE_TANGENT\n	vec3 objectTangent = vec3( tangent.xyz );\n#endif",
	bsdfs: "float G_BlinnPhong_Implicit( ) {\n	return 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( specularColor, 1.0, dotVH );\n	float G = G_BlinnPhong_Implicit( );\n	float D = D_BlinnPhong( shininess, dotNH );\n	return F * ( G * D );\n} // validated",
	iridescence_fragment: "#ifdef USE_IRIDESCENCE\n	const mat3 XYZ_TO_REC709 = mat3(\n		 3.2404542, -0.9692660,  0.0556434,\n		-1.5371385,  1.8760108, -0.2040259,\n		-0.4985314,  0.0415560,  1.0572252\n	);\n	vec3 Fresnel0ToIor( vec3 fresnel0 ) {\n		vec3 sqrtF0 = sqrt( fresnel0 );\n		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );\n	}\n	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );\n	}\n	float IorToFresnel0( float transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));\n	}\n	vec3 evalSensitivity( float OPD, vec3 shift ) {\n		float phase = 2.0 * PI * OPD * 1.0e-9;\n		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );\n		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );\n		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );\n		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );\n		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );\n		xyz /= 1.0685e-7;\n		vec3 rgb = XYZ_TO_REC709 * xyz;\n		return rgb;\n	}\n	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {\n		vec3 I;\n		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );\n		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );\n		float cosTheta2Sq = 1.0 - sinTheta2Sq;\n		if ( cosTheta2Sq < 0.0 ) {\n			return vec3( 1.0 );\n		}\n		float cosTheta2 = sqrt( cosTheta2Sq );\n		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );\n		float R12 = F_Schlick( R0, 1.0, cosTheta1 );\n		float T121 = 1.0 - R12;\n		float phi12 = 0.0;\n		if ( iridescenceIOR < outsideIOR ) phi12 = PI;\n		float phi21 = PI - phi12;\n		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );\n		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );\n		vec3 phi23 = vec3( 0.0 );\n		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;\n		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;\n		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;\n		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\n		vec3 phi = vec3( phi21 ) + phi23;\n		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );\n		vec3 r123 = sqrt( R123 );\n		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );\n		vec3 C0 = R12 + Rs;\n		I = C0;\n		vec3 Cm = Rs - T121;\n		for ( int m = 1; m <= 2; ++ m ) {\n			Cm *= r123;\n			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );\n			I += Cm * Sm;\n		}\n		return max( I, vec3( 0.0 ) );\n	}\n#endif",
	bumpmap_pars_fragment: "#ifdef USE_BUMPMAP\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n	vec2 dHdxy_fwd() {\n		vec2 dSTdx = dFdx( vBumpMapUv );\n		vec2 dSTdy = dFdy( vBumpMapUv );\n		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;\n		return vec2( dBx, dBy );\n	}\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {\n		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );\n		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n		float fDet = dot( vSigmaX, R1 ) * faceDirection;\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n	}\n#endif",
	clipping_planes_fragment: "#if NUM_CLIPPING_PLANES > 0\n	vec4 plane;\n	#ifdef ALPHA_TO_COVERAGE\n		float distanceToPlane, distanceGradient;\n		float clipOpacity = 1.0;\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n			distanceGradient = fwidth( distanceToPlane ) / 2.0;\n			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			if ( clipOpacity == 0.0 ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			float unionClipOpacity = 1.0;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n				distanceGradient = fwidth( distanceToPlane ) / 2.0;\n				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			}\n			#pragma unroll_loop_end\n			clipOpacity *= 1.0 - unionClipOpacity;\n		#endif\n		diffuseColor.a *= clipOpacity;\n		if ( diffuseColor.a == 0.0 ) discard;\n	#else\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			bool clipped = true;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;\n			}\n			#pragma unroll_loop_end\n			if ( clipped ) discard;\n		#endif\n	#endif\n#endif",
	clipping_planes_pars_fragment: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif",
	clipping_planes_pars_vertex: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n#endif",
	clipping_planes_vertex: "#if NUM_CLIPPING_PLANES > 0\n	vClipPosition = - mvPosition.xyz;\n#endif",
	color_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	diffuseColor *= vColor;\n#endif",
	color_pars_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#endif",
	color_pars_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	varying vec4 vColor;\n#endif",
	color_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	vColor = vec4( 1.0 );\n#endif\n#ifdef USE_COLOR_ALPHA\n	vColor *= color;\n#elif defined( USE_COLOR )\n	vColor.rgb *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n	vColor.rgb *= instanceColor.rgb;\n#endif\n#ifdef USE_BATCHING_COLOR\n	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );\n#endif",
	common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.5707963267948966\n#define RECIPROCAL_PI 0.3183098861837907\n#define RECIPROCAL_PI2 0.15915494309189535\n#define EPSILON 1e-6\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\n#define whiteComplement( a ) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nvec3 pow2( const in vec3 x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }\nfloat average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }\nhighp float rand( const in vec2 uv ) {\n	const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n	return fract( sin( sn ) * c );\n}\n#ifdef HIGH_PRECISION\n	float precisionSafeLength( vec3 v ) { return length( v ); }\n#else\n	float precisionSafeLength( vec3 v ) {\n		float maxComponent = max3( abs( v ) );\n		return length( v / maxComponent ) * maxComponent;\n	}\n#endif\nstruct IncidentLight {\n	vec3 color;\n	vec3 direction;\n	bool visible;\n};\nstruct ReflectedLight {\n	vec3 directDiffuse;\n	vec3 directSpecular;\n	vec3 indirectDiffuse;\n	vec3 indirectSpecular;\n};\n#ifdef USE_ALPHAHASH\n	varying vec3 vPosition;\n#endif\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\n#define inverseTransformDirection transformDirectionByInverseViewMatrix\nvec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {\n	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );\n}\nvec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {\n	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );\n}\nbool isPerspectiveMatrix( mat4 m ) {\n	return m[ 2 ][ 3 ] == - 1.0;\n}\nvec2 equirectUv( in vec3 dir ) {\n	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n	return vec2( u, v );\n}\nvec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n	return RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n}\nfloat F_Schlick( const in float f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n} // validated",
	cube_uv_reflection_fragment: "#ifdef ENVMAP_TYPE_CUBE_UV\n	#define cubeUV_minMipLevel 4.0\n	#define cubeUV_minTileSize 16.0\n	float getFace( vec3 direction ) {\n		vec3 absDirection = abs( direction );\n		float face = - 1.0;\n		if ( absDirection.x > absDirection.z ) {\n			if ( absDirection.x > absDirection.y )\n				face = direction.x > 0.0 ? 0.0 : 3.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		} else {\n			if ( absDirection.z > absDirection.y )\n				face = direction.z > 0.0 ? 2.0 : 5.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		}\n		return face;\n	}\n	vec2 getUV( vec3 direction, float face ) {\n		vec2 uv;\n		if ( face == 0.0 ) {\n			uv = vec2( direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 1.0 ) {\n			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );\n		} else if ( face == 2.0 ) {\n			uv = vec2( - direction.x, direction.y ) / abs( direction.z );\n		} else if ( face == 3.0 ) {\n			uv = vec2( - direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 4.0 ) {\n			uv = vec2( - direction.x, direction.z ) / abs( direction.y );\n		} else {\n			uv = vec2( direction.x, direction.y ) / abs( direction.z );\n		}\n		return 0.5 * ( uv + 1.0 );\n	}\n	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {\n		float face = getFace( direction );\n		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );\n		mipInt = max( mipInt, cubeUV_minMipLevel );\n		float faceSize = exp2( mipInt );\n		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;\n		if ( face > 2.0 ) {\n			uv.y += faceSize;\n			face -= 3.0;\n		}\n		uv.x += face * faceSize;\n		uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );\n		uv.x *= CUBEUV_TEXEL_WIDTH;\n		uv.y *= CUBEUV_TEXEL_HEIGHT;\n		#ifdef texture2DGradEXT\n			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;\n		#else\n			return texture2D( envMap, uv ).rgb;\n		#endif\n	}\n	#define cubeUV_r0 1.0\n	#define cubeUV_m0 - 2.0\n	#define cubeUV_r1 0.8\n	#define cubeUV_m1 - 1.0\n	#define cubeUV_r4 0.4\n	#define cubeUV_m4 2.0\n	#define cubeUV_r5 0.305\n	#define cubeUV_m5 3.0\n	#define cubeUV_r6 0.21\n	#define cubeUV_m6 4.0\n	float roughnessToMip( float roughness ) {\n		float mip = 0.0;\n		if ( roughness >= cubeUV_r1 ) {\n			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;\n		} else if ( roughness >= cubeUV_r4 ) {\n			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;\n		} else if ( roughness >= cubeUV_r5 ) {\n			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;\n		} else if ( roughness >= cubeUV_r6 ) {\n			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;\n		} else {\n			mip = - 2.0 * log2( 1.16 * roughness );		}\n		return mip;\n	}\n	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {\n		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );\n		float mipF = fract( mip );\n		float mipInt = floor( mip );\n		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );\n		if ( mipF == 0.0 ) {\n			return vec4( color0, 1.0 );\n		} else {\n			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );\n			return vec4( mix( color0, color1, mipF ), 1.0 );\n		}\n	}\n#endif",
	defaultnormal_vertex: "vec3 transformedNormal = objectNormal;\n#ifdef USE_TANGENT\n	vec3 transformedTangent = objectTangent;\n#endif\n#ifdef USE_BATCHING\n	mat3 bm = mat3( batchingMatrix );\n	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );\n	transformedNormal = bm * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = bm * transformedTangent;\n	#endif\n#endif\n#ifdef USE_INSTANCING\n	mat3 im = mat3( instanceMatrix );\n	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );\n	transformedNormal = im * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = im * transformedTangent;\n	#endif\n#endif\ntransformedNormal = normalMatrix * transformedNormal;\n#ifdef FLIP_SIDED\n	transformedNormal = - transformedNormal;\n#endif\n#ifdef USE_TANGENT\n	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;\n#endif",
	displacementmap_pars_vertex: "#ifdef USE_DISPLACEMENTMAP\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n#endif",
	displacementmap_vertex: "#ifdef USE_DISPLACEMENTMAP\n	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );\n#endif",
	emissivemap_fragment: "#ifdef USE_EMISSIVEMAP\n	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE\n		emissiveColor = sRGBTransferEOTF( emissiveColor );\n	#endif\n	totalEmissiveRadiance *= emissiveColor.rgb;\n#endif",
	emissivemap_pars_fragment: "#ifdef USE_EMISSIVEMAP\n	uniform sampler2D emissiveMap;\n#endif",
	colorspace_fragment: "gl_FragColor = linearToOutputTexel( gl_FragColor );",
	colorspace_pars_fragment: "vec4 LinearTransferOETF( in vec4 value ) {\n	return value;\n}\nvec4 sRGBTransferEOTF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );\n}\nvec4 sRGBTransferOETF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}",
	envmap_fragment: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vec3 cameraToFrag;\n		if ( isOrthographic ) {\n			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToFrag = normalize( vWorldPosition - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vec3 reflectVec = reflect( cameraToFrag, worldNormal );\n		#else\n			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );\n		#endif\n	#else\n		vec3 reflectVec = vReflect;\n	#endif\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );\n		#ifdef ENVMAP_BLENDING_MULTIPLY\n			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_MIX )\n			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_ADD )\n			outgoingLight += envColor.xyz * specularStrength * reflectivity;\n		#endif\n	#endif\n#endif",
	envmap_common_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float envMapIntensity;\n	uniform mat3 envMapRotation;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n#endif",
	envmap_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float reflectivity;\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		varying vec3 vWorldPosition;\n		uniform float refractionRatio;\n	#else\n		varying vec3 vReflect;\n	#endif\n#endif",
	envmap_pars_vertex: "#ifdef USE_ENVMAP\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		\n		varying vec3 vWorldPosition;\n	#else\n		varying vec3 vReflect;\n		uniform float refractionRatio;\n	#endif\n#endif",
	envmap_physical_pars_fragment: "#ifdef USE_ENVMAP\n	vec3 getIBLIrradiance( const in vec3 normal ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n			return PI * envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 reflectVec = reflect( - viewDir, normal );\n			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );\n			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n			return envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	#ifdef USE_RETROREFLECTION\n		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );\n				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );\n				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );\n				return envMapColor.rgb * envMapIntensity;\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n	#endif\n	#ifdef USE_ANISOTROPY\n		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 bentNormal = cross( bitangent, viewDir );\n				bentNormal = normalize( cross( bentNormal, bitangent ) );\n				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n				return getIBLRadiance( viewDir, bentNormal, roughness );\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n		#ifdef USE_RETROREFLECTION\n			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n				#ifdef ENVMAP_TYPE_CUBE_UV\n					vec3 bentNormal = cross( bitangent, viewDir );\n					bentNormal = normalize( cross( bentNormal, bitangent ) );\n					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n					return getIBLRetroRadiance( viewDir, bentNormal, roughness );\n				#else\n					return vec3( 0.0 );\n				#endif\n			}\n		#endif\n	#endif\n#endif",
	envmap_vertex: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vWorldPosition = worldPosition.xyz;\n	#else\n		vec3 cameraToVertex;\n		if ( isOrthographic ) {\n			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vReflect = reflect( cameraToVertex, worldNormal );\n		#else\n			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n		#endif\n	#endif\n#endif",
	fog_vertex: "#ifdef USE_FOG\n	vFogDepth = - mvPosition.z;\n#endif",
	fog_pars_vertex: "#ifdef USE_FOG\n	varying float vFogDepth;\n#endif",
	fog_fragment: "#ifdef USE_FOG\n	#ifdef FOG_EXP2\n		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n	#else\n		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n	#endif\n	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif",
	fog_pars_fragment: "#ifdef USE_FOG\n	uniform vec3 fogColor;\n	varying float vFogDepth;\n	#ifdef FOG_EXP2\n		uniform float fogDensity;\n	#else\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n#endif",
	gradientmap_pars_fragment: "#ifdef USE_GRADIENTMAP\n	uniform sampler2D gradientMap;\n#endif\nvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n	float dotNL = dot( normal, lightDirection );\n	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n	#ifdef USE_GRADIENTMAP\n		return vec3( texture2D( gradientMap, coord ).r );\n	#else\n		vec2 fw = fwidth( coord ) * 0.5;\n		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );\n	#endif\n}",
	lightmap_pars_fragment: "#ifdef USE_LIGHTMAP\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n#endif",
	lights_lambert_fragment: "LambertMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularStrength = specularStrength;",
	lights_lambert_pars_fragment: "varying vec3 vViewPosition;\nstruct LambertMaterial {\n	vec3 diffuseColor;\n	float specularStrength;\n};\nvoid RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Lambert\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert",
	lights_pars_begin: "uniform bool receiveShadow;\nuniform vec3 ambientLightColor;\n#if defined( USE_LIGHT_PROBES )\n	uniform vec3 lightProbe[ 9 ];\n#endif\nvec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {\n	float x = normal.x, y = normal.y, z = normal.z;\n	vec3 result = shCoefficients[ 0 ] * 0.886227;\n	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;\n	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;\n	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;\n	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;\n	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;\n	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );\n	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;\n	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );\n	return result;\n}\nvec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {\n	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );\n	return irradiance;\n}\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n	vec3 irradiance = ambientLightColor;\n	return irradiance;\n}\nfloat getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n	if ( cutoffDistance > 0.0 ) {\n		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n	}\n	return distanceFalloff;\n}\nfloat getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {\n	return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n#if NUM_SUN_LIGHTS > 0\n	struct SunLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];\n	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {\n		light.color = sunLight.color;\n		light.direction = sunLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_DIR_LIGHTS > 0\n	struct DirectionalLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {\n		light.color = directionalLight.color;\n		light.direction = directionalLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_POINT_LIGHTS > 0\n	struct PointLight {\n		vec3 position;\n		vec3 color;\n		float distance;\n		float decay;\n	};\n	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = pointLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float lightDistance = length( lVector );\n		light.color = pointLight.color;\n		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );\n		light.visible = ( light.color != vec3( 0.0 ) );\n	}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n	struct SpotLight {\n		vec3 position;\n		vec3 direction;\n		vec3 color;\n		float distance;\n		float decay;\n		float coneCos;\n		float penumbraCos;\n	};\n	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = spotLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float angleCos = dot( light.direction, spotLight.direction );\n		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n		if ( spotAttenuation > 0.0 ) {\n			float lightDistance = length( lVector );\n			light.color = spotLight.color * spotAttenuation;\n			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );\n			light.visible = ( light.color != vec3( 0.0 ) );\n		} else {\n			light.color = vec3( 0.0 );\n			light.visible = false;\n		}\n	}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n	struct RectAreaLight {\n		vec3 color;\n		vec3 position;\n		vec3 halfWidth;\n		vec3 halfHeight;\n	};\n	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;\n	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n	struct HemisphereLight {\n		vec3 direction;\n		vec3 skyColor;\n		vec3 groundColor;\n	};\n	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {\n		float dotNL = dot( normal, hemiLight.direction );\n		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n		return irradiance;\n	}\n#endif\n#include <lightprobes_pars_fragment>",
	lights_toon_fragment: "ToonMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;",
	lights_toon_pars_fragment: "varying vec3 vViewPosition;\nstruct ToonMaterial {\n	vec3 diffuseColor;\n};\nvoid RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Toon\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon",
	lights_phong_fragment: "BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;",
	lights_phong_pars_fragment: "varying vec3 vViewPosition;\nstruct BlinnPhongMaterial {\n	vec3 diffuseColor;\n	vec3 specularColor;\n	float specularShininess;\n	float specularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_BlinnPhong\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong",
	lights_physical_fragment: "PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nmaterial.metalness = metalnessFactor;\nvec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );\nfloat geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );\nmaterial.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;\nmaterial.roughness = min( material.roughness, 1.0 );\n#ifdef IOR\n	material.ior = ior;\n	#ifdef USE_SPECULAR\n		float specularIntensityFactor = specularIntensity;\n		vec3 specularColorFactor = specularColor;\n		#ifdef USE_SPECULAR_COLORMAP\n			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;\n		#endif\n		#ifdef USE_SPECULAR_INTENSITYMAP\n			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;\n		#endif\n		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );\n	#else\n		float specularIntensityFactor = 1.0;\n		vec3 specularColorFactor = vec3( 1.0 );\n		material.specularF90 = 1.0;\n	#endif\n	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n#else\n	material.specularColor = vec3( 0.04 );\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n	material.specularF90 = 1.0;\n#endif\n#ifdef USE_CLEARCOAT\n	material.clearcoat = clearcoat;\n	material.clearcoatRoughness = clearcoatRoughness;\n	material.clearcoatF0 = vec3( 0.04 );\n	material.clearcoatF90 = 1.0;\n	#ifdef USE_CLEARCOATMAP\n		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;\n	#endif\n	#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;\n	#endif\n	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );\n	material.clearcoatRoughness += geometryRoughness;\n	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );\n#endif\n#ifdef USE_DISPERSION\n	material.dispersion = dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	material.retroreflectivity = retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	material.iridescence = iridescence;\n	material.iridescenceIOR = iridescenceIOR;\n	#ifdef USE_IRIDESCENCEMAP\n		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;\n	#endif\n	#ifdef USE_IRIDESCENCE_THICKNESSMAP\n		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;\n	#else\n		material.iridescenceThickness = iridescenceThicknessMaximum;\n	#endif\n#endif\n#ifdef USE_SHEEN\n	material.sheenColor = sheenColor;\n	#ifdef USE_SHEEN_COLORMAP\n		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;\n	#endif\n	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	#ifdef USE_ANISOTROPYMAP\n		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );\n		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;\n		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;\n	#else\n		vec2 anisotropyV = anisotropyVector;\n	#endif\n	material.anisotropy = length( anisotropyV );\n	if( material.anisotropy == 0.0 ) {\n		anisotropyV = vec2( 1.0, 0.0 );\n	} else {\n		anisotropyV /= material.anisotropy;\n		material.anisotropy = saturate( material.anisotropy );\n	}\n	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );\n	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;\n	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;\n#endif",
	lights_physical_pars_fragment: "uniform sampler2D dfgLUT;\nstruct PhysicalMaterial {\n	vec3 diffuseColor;\n	vec3 diffuseContribution;\n	vec3 specularColor;\n	vec3 specularColorBlended;\n	float roughness;\n	float metalness;\n	float specularF90;\n	float dispersion;\n	vec2 dfg;\n	vec3 multiScatteringCompensation;\n	#ifdef USE_RETROREFLECTION\n		float retroreflectivity;\n	#endif\n	#ifdef USE_CLEARCOAT\n		float clearcoat;\n		float clearcoatRoughness;\n		vec3 clearcoatF0;\n		float clearcoatF90;\n	#endif\n	#ifdef USE_IRIDESCENCE\n		float iridescence;\n		float iridescenceIOR;\n		float iridescenceThickness;\n		vec3 iridescenceFresnel;\n		vec3 iridescenceF0Dielectric;\n		vec3 iridescenceF0Metallic;\n	#endif\n	#ifdef USE_SHEEN\n		vec3 sheenColor;\n		float sheenRoughness;\n	#endif\n	#ifdef IOR\n		float ior;\n	#endif\n	#ifdef USE_TRANSMISSION\n		float transmission;\n		float transmissionAlpha;\n		float thickness;\n		float attenuationDistance;\n		vec3 attenuationColor;\n	#endif\n	#ifdef USE_ANISOTROPY\n		float anisotropy;\n		float alphaT;\n		vec3 anisotropyT;\n		vec3 anisotropyB;\n	#endif\n};\nvec3 clearcoatSpecularDirect = vec3( 0.0 );\nvec3 clearcoatSpecularIndirect = vec3( 0.0 );\nvec3 sheenSpecularDirect = vec3( 0.0 );\nvec3 sheenSpecularIndirect = vec3(0.0 );\nvec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {\n    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );\n    float x2 = x * x;\n    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );\n    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );\n}\nfloat V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n	float a2 = pow2( alpha );\n	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n	return 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n	float a2 = pow2( alpha );\n	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n	return RECIPROCAL_PI * a2 / pow2( denom );\n}\n#ifdef USE_ANISOTROPY\n	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {\n		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );\n		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );\n		return 0.5 / max( gv + gl, EPSILON );\n	}\n	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {\n		float a2 = alphaT * alphaB;\n		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );\n		highp float v2 = dot( v, v );\n		float w2 = a2 / v2;\n		return RECIPROCAL_PI * a2 * pow2 ( w2 );\n	}\n#endif\n#ifdef USE_CLEARCOAT\n	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {\n		vec3 f0 = material.clearcoatF0;\n		float f90 = material.clearcoatF90;\n		float roughness = material.clearcoatRoughness;\n		float alpha = pow2( roughness );\n		vec3 halfDir = normalize( lightDir + viewDir );\n		float dotNL = saturate( dot( normal, lightDir ) );\n		float dotNV = saturate( dot( normal, viewDir ) );\n		float dotNH = saturate( dot( normal, halfDir ) );\n		float dotVH = saturate( dot( viewDir, halfDir ) );\n		vec3 F = F_Schlick( f0, f90, dotVH );\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n		return F * ( V * D );\n	}\n#endif\nvec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {\n	vec3 f0 = material.specularColorBlended;\n	float f90 = material.specularF90;\n	float roughness = material.roughness;\n	float alpha = pow2( roughness );\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( f0, f90, dotVH );\n	#ifdef USE_IRIDESCENCE\n		F = mix( F, material.iridescenceFresnel, material.iridescence );\n	#endif\n	#ifdef USE_ANISOTROPY\n		float dotTL = dot( material.anisotropyT, lightDir );\n		float dotTV = dot( material.anisotropyT, viewDir );\n		float dotTH = dot( material.anisotropyT, halfDir );\n		float dotBL = dot( material.anisotropyB, lightDir );\n		float dotBV = dot( material.anisotropyB, viewDir );\n		float dotBH = dot( material.anisotropyB, halfDir );\n		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );\n		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );\n	#else\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n	#endif\n	return F * ( V * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n	const float LUT_SIZE = 64.0;\n	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n	const float LUT_BIAS = 0.5 / LUT_SIZE;\n	float dotNV = saturate( dot( N, V ) );\n	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n	uv = uv * LUT_SCALE + LUT_BIAS;\n	return uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n	float l = length( f );\n	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n	float x = dot( v1, v2 );\n	float y = abs( x );\n	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n	float b = 3.4175940 + ( 4.1616724 + y ) * y;\n	float v = a / b;\n	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n	return cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n	vec3 lightNormal = cross( v1, v2 );\n	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n	vec3 T1, T2;\n	T1 = normalize( V - N * dot( V, N ) );\n	T2 = - cross( N, T1 );\n	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );\n	vec3 coords[ 4 ];\n	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n	coords[ 0 ] = normalize( coords[ 0 ] );\n	coords[ 1 ] = normalize( coords[ 1 ] );\n	coords[ 2 ] = normalize( coords[ 2 ] );\n	coords[ 3 ] = normalize( coords[ 3 ] );\n	vec3 vectorFormFactor = vec3( 0.0 );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n	return vec3( result );\n}\n#if defined( USE_SHEEN )\nfloat D_Charlie( float roughness, float dotNH ) {\n	float alpha = pow2( roughness );\n	float invAlpha = 1.0 / alpha;\n	float cos2h = dotNH * dotNH;\n	float sin2h = max( 1.0 - cos2h, 0.0078125 );\n	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );\n}\nfloat V_Neubelt( float dotNV, float dotNL ) {\n	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );\n}\nvec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float D = D_Charlie( sheenRoughness, dotNH );\n	float V = V_Neubelt( dotNV, dotNL );\n	return sheenColor * ( D * V );\n}\n#endif\nfloat IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float r2 = roughness * roughness;\n	float rInv = 1.0 / ( roughness + 0.1 );\n	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;\n	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;\n	float DG = exp( a * dotNV + b );\n	return saturate( DG );\n}\nvec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;\n	return specularColor * fab.x + specularF90 * fab.y;\n}\n#ifdef USE_IRIDESCENCE\nvoid computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#else\nvoid computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#endif\n	#ifdef USE_IRIDESCENCE\n		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );\n	#else\n		vec3 Fr = specularColor;\n	#endif\n	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;\n	float Ess = fab.x + fab.y;\n	float Ems = 1.0 - Ess;\n	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );\n	singleScatter += FssEss;\n	multiScatter += Fms * Ems;\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n		vec3 normal = geometryNormal;\n		vec3 viewDir = geometryViewDir;\n		vec3 position = geometryPosition;\n		vec3 lightPos = rectAreaLight.position;\n		vec3 halfWidth = rectAreaLight.halfWidth;\n		vec3 halfHeight = rectAreaLight.halfHeight;\n		vec3 lightColor = rectAreaLight.color;\n		float roughness = material.roughness;\n		vec3 rectCoords[ 4 ];\n		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;\n		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;\n		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;\n		vec2 uv = LTC_Uv( normal, viewDir, roughness );\n		vec4 t1 = texture2D( ltc_1, uv );\n		vec4 t2 = texture2D( ltc_2, uv );\n		mat3 mInv = mat3(\n			vec3( t1.x, 0, t1.y ),\n			vec3(    0, 1,    0 ),\n			vec3( t1.z, 0, t1.w )\n		);\n		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );\n		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n		#ifdef USE_CLEARCOAT\n			vec3 Ncc = geometryClearcoatNormal;\n			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );\n			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );\n			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );\n			mat3 mInvClearcoat = mat3(\n				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),\n				vec3(             0, 1,             0 ),\n				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )\n			);\n			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;\n			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );\n		#endif\n	}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	#ifdef USE_CLEARCOAT\n		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );\n		vec3 ccIrradiance = dotNLcc * directLight.color;\n		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );\n	#endif\n	#ifdef USE_SHEEN\n \n 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );\n \n 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );\n \n 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );\n \n 		irradiance *= sheenEnergyComp;\n \n 	#endif\n	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );\n		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );\n		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;\n	vec3 halfDir = normalize( directLight.direction + geometryViewDir );\n	float dotVH = saturate( dot( geometryViewDir, halfDir ) );\n	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );\n		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );\n		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );\n		F = mix( F, retroF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 singleScattering = vec3( 0.0 );\n	vec3 multiScattering = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );\n	#endif\n	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		diffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectDiffuse += diffuse;\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n	#ifdef USE_CLEARCOAT\n		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;\n 	#endif\n	vec3 singleScatteringDielectric = vec3( 0.0 );\n	vec3 multiScatteringDielectric = vec3( 0.0 );\n	vec3 singleScatteringMetallic = vec3( 0.0 );\n	vec3 multiScatteringMetallic = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );\n	#endif\n	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );\n	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );\n	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;\n	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );\n	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n	vec3 indirectSpecular = radiance * singleScattering;\n	indirectSpecular += multiScattering * cosineWeightedIrradiance;\n	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		indirectSpecular *= sheenEnergyComp;\n		indirectDiffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectSpecular += indirectSpecular;\n	reflectedLight.indirectDiffuse += indirectDiffuse;\n}\n#define RE_Direct				RE_Direct_Physical\n#define RE_Direct_RectArea		RE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular		RE_IndirectSpecular_Physical\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}",
	lights_fragment_begin: "\nvec3 geometryPosition = - vViewPosition;\nvec3 geometryNormal = normal;\nvec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\nvec3 geometryClearcoatNormal = vec3( 0.0 );\n#ifdef USE_CLEARCOAT\n	geometryClearcoatNormal = clearcoatNormal;\n#endif\n#ifdef USE_IRIDESCENCE\n	float dotNVi = saturate( dot( normal, geometryViewDir ) );\n	if ( material.iridescenceThickness == 0.0 ) {\n		material.iridescence = 0.0;\n	} else {\n		material.iridescence = saturate( material.iridescence );\n	}\n	if ( material.iridescence > 0.0 ) {\n		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );\n		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );\n		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );\n		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );\n		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );\n	}\n#endif\n#ifdef STANDARD\n	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );\n	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;\n	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )\n		float EssMs = material.dfg.x + material.dfg.y;\n		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );\n	#endif\n#endif\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n	PointLight pointLight;\n	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n		pointLight = pointLights[ i ];\n		getPointLightInfo( pointLight, geometryPosition, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n		pointLightShadow = pointLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n	SpotLight spotLight;\n	vec4 spotColor;\n	vec3 spotLightCoord;\n	bool inSpotLightMap;\n	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n		spotLight = spotLights[ i ];\n		getSpotLightInfo( spotLight, geometryPosition, directLight );\n		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX\n		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS\n		#else\n		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#endif\n		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )\n			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;\n			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );\n			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;\n		#endif\n		#undef SPOT_LIGHT_MAP_INDEX\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		spotLightShadow = spotLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )\n	SunLight sunLight;\n	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {\n		sunLight = sunLights[ i ];\n		getSunLightInfo( sunLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )\n		sunLightShadow = sunLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n	DirectionalLight directionalLight;\n	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n		directionalLight = directionalLights[ i ];\n		getDirectionalLightInfo( directionalLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n		directionalLightShadow = directionalLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n	RectAreaLight rectAreaLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n		rectAreaLight = rectAreaLights[ i ];\n		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if defined( RE_IndirectDiffuse )\n	vec3 iblIrradiance = vec3( 0.0 );\n	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n	#if defined( USE_LIGHT_PROBES )\n		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n	#endif\n	#if ( NUM_HEMI_LIGHTS > 0 )\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n		}\n		#pragma unroll_loop_end\n	#endif\n	#ifdef USE_LIGHT_PROBES_GRID\n		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;\n		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );\n		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );\n	#endif\n#endif\n#if defined( RE_IndirectSpecular )\n	vec3 radiance = vec3( 0.0 );\n	vec3 clearcoatRadiance = vec3( 0.0 );\n#endif",
	lights_fragment_maps: "#if defined( RE_IndirectDiffuse )\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;\n		irradiance += lightMapIrradiance;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )\n		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )\n			iblIrradiance += getIBLIrradiance( geometryNormal );\n		#endif\n	#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n	#ifdef USE_ANISOTROPY\n		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n	#else\n		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );\n	#endif\n	#ifdef USE_RETROREFLECTION\n		#ifdef USE_ANISOTROPY\n			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n		#else\n			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );\n		#endif\n		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );\n	#endif\n	radiance += iblRadiance;\n	#ifdef USE_CLEARCOAT\n		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );\n	#endif\n#endif",
	lights_fragment_end: "#if defined( RE_IndirectDiffuse )\n	#if defined( LAMBERT ) || defined( PHONG )\n		irradiance += iblIrradiance;\n	#endif\n	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif",
	lightprobes_pars_fragment: "#ifdef USE_LIGHT_PROBES_GRID\nuniform highp sampler3D probesSH;\nuniform vec3 probesMin;\nuniform vec3 probesMax;\nuniform vec3 probesResolution;\nvec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {\n	vec3 res = probesResolution;\n	vec3 gridRange = probesMax - probesMin;\n	vec3 resMinusOne = res - 1.0;\n	vec3 probeSpacing = gridRange / resMinusOne;\n	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;\n	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );\n	uvw = uvw * resMinusOne / res + 0.5 / res;\n	float nz          = res.z;\n	float paddedSlices = nz + 2.0;\n	float atlasDepth  = 7.0 * paddedSlices;\n	float uvZBase     = uvw.z * nz + 1.0;\n	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );\n	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );\n	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );\n	vec3 c0 = s0.xyz;\n	vec3 c1 = vec3( s0.w, s1.xy );\n	vec3 c2 = vec3( s1.zw, s2.x );\n	vec3 c3 = s2.yzw;\n	vec3 c4 = s3.xyz;\n	vec3 c5 = vec3( s3.w, s4.xy );\n	vec3 c6 = vec3( s4.zw, s5.x );\n	vec3 c7 = s5.yzw;\n	vec3 c8 = s6.xyz;\n	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;\n	vec3 result = c0 * 0.886227;\n	result += c1 * 2.0 * 0.511664 * y;\n	result += c2 * 2.0 * 0.511664 * z;\n	result += c3 * 2.0 * 0.511664 * x;\n	result += c4 * 2.0 * 0.429043 * x * y;\n	result += c5 * 2.0 * 0.429043 * y * z;\n	result += c6 * ( 0.743125 * z * z - 0.247708 );\n	result += c7 * 2.0 * 0.429043 * x * z;\n	result += c8 * 0.429043 * ( x * x - y * y );\n	return max( result, vec3( 0.0 ) );\n}\n#endif",
	logdepthbuf_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif",
	logdepthbuf_pars_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	uniform float logDepthBufFC;\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_pars_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	vFragDepth = 1.0 + gl_Position.w;\n	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );\n#endif",
	map_fragment: "#ifdef USE_MAP\n	vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );\n	#endif\n	diffuseColor *= sampledDiffuseColor;\n#endif",
	map_pars_fragment: "#ifdef USE_MAP\n	uniform sampler2D map;\n#endif",
	map_particle_fragment: "#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n	#if defined( USE_POINTS_UV )\n		vec2 uv = vUv;\n	#else\n		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n	#endif\n#endif\n#ifdef USE_MAP\n	diffuseColor *= texture2D( map, uv );\n#endif\n#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, uv ).g;\n#endif",
	map_particle_pars_fragment: "#if defined( USE_POINTS_UV )\n	varying vec2 vUv;\n#else\n	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n		uniform mat3 uvTransform;\n	#endif\n#endif\n#ifdef USE_MAP\n	uniform sampler2D map;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	metalnessmap_fragment: "float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );\n	metalnessFactor *= texelMetalness.b;\n#endif",
	metalnessmap_pars_fragment: "#ifdef USE_METALNESSMAP\n	uniform sampler2D metalnessMap;\n#endif",
	morphinstance_vertex: "#ifdef USE_INSTANCING_MORPH\n	float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;\n	}\n#endif",
	morphcolor_vertex: "#if defined( USE_MORPHCOLORS )\n	vColor *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		#if defined( USE_COLOR_ALPHA )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];\n		#elif defined( USE_COLOR )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];\n		#endif\n	}\n#endif",
	morphnormal_vertex: "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	morphtarget_pars_vertex: "#ifdef USE_MORPHTARGETS\n	#ifndef USE_INSTANCING_MORPH\n		uniform float morphTargetBaseInfluence;\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	#endif\n	uniform sampler2DArray morphTargetsTexture;\n	uniform ivec2 morphTargetsTextureSize;\n	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {\n		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;\n		int y = texelIndex / morphTargetsTextureSize.x;\n		int x = texelIndex - y * morphTargetsTextureSize.x;\n		ivec3 morphUV = ivec3( x, y, morphTargetIndex );\n		return texelFetch( morphTargetsTexture, morphUV, 0 );\n	}\n#endif",
	morphtarget_vertex: "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	normal_fragment_begin: "float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n#ifdef FLAT_SHADED\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n#else\n	vec3 normal = normalize( vNormal );\n	#ifdef DOUBLE_SIDED\n		normal *= faceDirection;\n	#endif\n#endif\n#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )\n	#ifdef USE_TANGENT\n		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn = getTangentFrame( - vViewPosition, normal,\n		#if defined( USE_NORMALMAP )\n			vNormalMapUv\n		#elif defined( USE_CLEARCOAT_NORMALMAP )\n			vClearcoatNormalMapUv\n		#else\n			vUv\n		#endif\n		);\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn[0] *= faceDirection;\n		tbn[1] *= faceDirection;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	#ifdef USE_TANGENT\n		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn2[0] *= faceDirection;\n		tbn2[1] *= faceDirection;\n	#endif\n#endif\nvec3 nonPerturbedNormal = normal;",
	normal_fragment_maps: "#ifdef USE_NORMALMAP_OBJECTSPACE\n	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#ifdef FLIP_SIDED\n		normal = - normal;\n	#endif\n	#ifdef DOUBLE_SIDED\n		normal = normal * faceDirection;\n	#endif\n	normal = normalize( normalMatrix * normal );\n#elif defined( USE_NORMALMAP_TANGENTSPACE )\n	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#if defined( USE_PACKED_NORMALMAP )\n		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );\n	#endif\n	mapN.xy *= normalScale;\n	normal = normalize( tbn * mapN );\n#elif defined( USE_BUMPMAP )\n	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n#endif",
	normal_pars_fragment: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_pars_vertex: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_vertex: "#ifndef FLAT_SHADED\n	vNormal = normalize( transformedNormal );\n	#ifdef USE_TANGENT\n		vTangent = normalize( transformedTangent );\n		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n		#ifdef FLIP_SIDED\n			vBitangent = - vBitangent;\n		#endif\n	#endif\n#endif",
	normalmap_pars_fragment: "#ifdef USE_NORMALMAP\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n#endif\n#ifdef USE_NORMALMAP_OBJECTSPACE\n	uniform mat3 normalMatrix;\n#endif\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )\n	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( uv.st );\n		vec2 st1 = dFdy( uv.st );\n		vec3 N = surf_norm;\n		vec3 q1perp = cross( q1, N );\n		vec3 q0perp = cross( N, q0 );\n		vec3 T = q1perp * st0.x + q0perp * st1.x;\n		vec3 B = q1perp * st0.y + q0perp * st1.y;\n		float det = max( dot( T, T ), dot( B, B ) );\n		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n		return mat3( T * scale, B * scale, N );\n	}\n#endif",
	clearcoat_normal_fragment_begin: "#ifdef USE_CLEARCOAT\n	vec3 clearcoatNormal = nonPerturbedNormal;\n#endif",
	clearcoat_normal_fragment_maps: "#ifdef USE_CLEARCOAT_NORMALMAP\n	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;\n	clearcoatMapN.xy *= clearcoatNormalScale;\n	clearcoatNormal = normalize( tbn2 * clearcoatMapN );\n#endif",
	clearcoat_pars_fragment: "#ifdef USE_CLEARCOATMAP\n	uniform sampler2D clearcoatMap;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform sampler2D clearcoatNormalMap;\n	uniform vec2 clearcoatNormalScale;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform sampler2D clearcoatRoughnessMap;\n#endif",
	iridescence_pars_fragment: "#ifdef USE_IRIDESCENCEMAP\n	uniform sampler2D iridescenceMap;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform sampler2D iridescenceThicknessMap;\n#endif",
	opaque_fragment: "#ifdef OPAQUE\ndiffuseColor.a = 1.0;\n#endif\n#ifdef USE_TRANSMISSION\ndiffuseColor.a *= material.transmissionAlpha;\n#endif\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );",
	packing: "vec3 packNormalToRGB( const in vec3 normal ) {\n	return normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n	return 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;\nconst float Inv255 = 1. / 255.;\nconst vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );\nconst vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );\nconst vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );\nconst vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );\nvec4 packDepthToRGBA( const in float v ) {\n	if( v <= 0.0 )\n		return vec4( 0., 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec4( 1., 1., 1., 1. );\n	float vuf;\n	float af = modf( v * PackFactors.a, vuf );\n	float bf = modf( vuf * ShiftRight8, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );\n}\nvec3 packDepthToRGB( const in float v ) {\n	if( v <= 0.0 )\n		return vec3( 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec3( 1., 1., 1. );\n	float vuf;\n	float bf = modf( v * PackFactors.b, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec3( vuf * Inv255, gf * PackUpscale, bf );\n}\nvec2 packDepthToRG( const in float v ) {\n	if( v <= 0.0 )\n		return vec2( 0., 0. );\n	if( v >= 1.0 )\n		return vec2( 1., 1. );\n	float vuf;\n	float gf = modf( v * 256., vuf );\n	return vec2( vuf * Inv255, gf );\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n	return dot( v, UnpackFactors4 );\n}\nfloat unpackRGBToDepth( const in vec3 v ) {\n	return dot( v, UnpackFactors3 );\n}\nfloat unpackRGToDepth( const in vec2 v ) {\n	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;\n}\nvec4 pack2HalfToRGBA( const in vec2 v ) {\n	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );\n	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );\n}\nvec2 unpackRGBATo2Half( const in vec4 v ) {\n	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n	\n		return depth * ( far - near ) - far;\n	#else\n		return depth * ( near - far ) - near;\n	#endif\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		return ( near * far ) / ( ( near - far ) * depth - near );\n	#else\n		return ( near * far ) / ( ( far - near ) * depth - far );\n	#endif\n}",
	premultiplied_alpha_fragment: "#ifdef PREMULTIPLIED_ALPHA\n	gl_FragColor.rgb *= gl_FragColor.a;\n#endif",
	project_vertex: "vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_BATCHING\n	mvPosition = batchingMatrix * mvPosition;\n#endif\n#ifdef USE_INSTANCING\n	mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;",
	dithering_fragment: "#ifdef DITHERING\n	gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif",
	dithering_pars_fragment: "#ifdef DITHERING\n	vec3 dithering( vec3 color ) {\n		float grid_position = rand( gl_FragCoord.xy );\n		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n		return color + dither_shift_RGB;\n	}\n#endif",
	roughnessmap_fragment: "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n	roughnessFactor *= texelRoughness.g;\n#endif",
	roughnessmap_pars_fragment: "#ifdef USE_ROUGHNESSMAP\n	uniform sampler2D roughnessMap;\n#endif",
	shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#if NUM_SPOT_LIGHT_MAPS > 0\n	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		#define SUN_LIGHT_CASCADES 2\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#endif\n		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n		struct SunLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#endif\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#elif defined( SHADOWMAP_TYPE_BASIC )\n			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float interleavedGradientNoise( vec2 position ) {\n			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );\n		}\n		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {\n			const float goldenAngle = 2.399963229728653;\n			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );\n			float theta = float( sampleIndex ) * goldenAngle + phi;\n			return vec2( cos( theta ), sin( theta ) ) * r;\n		}\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			shadowCoord.z += shadowBias;\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n				float radius = shadowRadius * texelSize.x;\n				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n				shadow = (\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )\n				) * 0.2;\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#elif defined( SHADOWMAP_TYPE_VSM )\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;\n				float mean = distribution.x;\n				float variance = distribution.y * distribution.y;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					float hard_shadow = step( mean, shadowCoord.z );\n				#else\n					float hard_shadow = step( shadowCoord.z, mean );\n				#endif\n				\n				if ( hard_shadow == 1.0 ) {\n					shadow = 1.0;\n				} else {\n					variance = max( variance, 0.0000001 );\n					float d = shadowCoord.z - mean;\n					float p_max = variance / ( variance + d * d );\n					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );\n					shadow = max( hard_shadow, p_max );\n				}\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#else\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				float depth = texture2D( shadowMap, shadowCoord.xy ).r;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					shadow = step( depth, shadowCoord.z );\n				#else\n					shadow = step( shadowCoord.z, depth );\n				#endif\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#endif\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		float getSunShadow(\n			#if defined( SHADOWMAP_TYPE_PCF )\n				sampler2DShadow shadowMap,\n			#else\n				sampler2D shadowMap,\n			#endif\n			SunLightShadow sunLightShadow,\n			int shadowIndex\n		) {\n			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );\n			float viewDepth = vSunShadowWorldPosition.w;\n			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;\n			float shadow = 1.0;\n			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {\n				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];\n				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {\n					float cascadeShadow = getShadow(\n						shadowMap,\n						sunLightShadow.shadowMapSize,\n						sunLightShadow.shadowIntensity,\n						sunLightShadow.shadowBias,\n						sunLightShadow.shadowRadius,\n						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition\n					);\n					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );\n				}\n			}\n			return shadow;\n		}\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n	#if defined( SHADOWMAP_TYPE_PCF )\n	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 bd3D = normalize( lightToPosition );\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp -= shadowBias;\n			#else\n				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp += shadowBias;\n			#endif\n			float texelSize = shadowRadius / shadowMapSize.x;\n			vec3 absDir = abs( bd3D );\n			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );\n			tangent = normalize( cross( bd3D, tangent ) );\n			vec3 bitangent = cross( bd3D, tangent );\n			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n			vec2 sample0 = vogelDiskSample( 0, 5, phi );\n			vec2 sample1 = vogelDiskSample( 1, 5, phi );\n			vec2 sample2 = vogelDiskSample( 2, 5, phi );\n			vec2 sample3 = vogelDiskSample( 3, 5, phi );\n			vec2 sample4 = vogelDiskSample( 4, 5, phi );\n			shadow = (\n				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )\n			) * 0.2;\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#elif defined( SHADOWMAP_TYPE_BASIC )\n	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n			dp += shadowBias;\n			vec3 bd3D = normalize( lightToPosition );\n			float depth = textureCube( shadowMap, bd3D ).r;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				depth = 1.0 - depth;\n			#endif\n			shadow = step( dp, depth );\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#endif\n	#endif\n#endif",
	shadowmap_pars_vertex: "#if NUM_SPOT_LIGHT_COORDS > 0\n	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n#endif",
	shadowmap_vertex: "#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )\n	#ifdef HAS_NORMAL\n		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n	#else\n		vec3 shadowWorldNormal = vec3( 0.0 );\n	#endif\n	vec4 shadowWorldPosition;\n#endif\n#if defined( USE_SHADOWMAP )\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );\n		vSunShadowWorldNormal = shadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );\n			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );\n			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if NUM_SPOT_LIGHT_COORDS > 0\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {\n		shadowWorldPosition = worldPosition;\n		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;\n		#endif\n		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;\n	}\n	#pragma unroll_loop_end\n#endif",
	shadowmask_pars_fragment: "float getShadowMask() {\n	float shadow = 1.0;\n	#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {\n		sunLight = sunLightShadows[ i ];\n		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n		directionalLight = directionalLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {\n		spotLight = spotLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n	PointLightShadow pointLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n		pointLight = pointLightShadows[ i ];\n		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#endif\n	return shadow;\n}",
	skinbase_vertex: "#ifdef USE_SKINNING\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif",
	skinning_pars_vertex: "#ifdef USE_SKINNING\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n	uniform highp sampler2D boneTexture;\n	mat4 getBoneMatrix( const in float i ) {\n		int size = textureSize( boneTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n#endif",
	skinning_vertex: "#ifdef USE_SKINNING\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	transformed = ( bindMatrixInverse * skinned ).xyz;\n#endif",
	skinnormal_vertex: "#ifdef USE_SKINNING\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n	#ifdef USE_TANGENT\n		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;\n	#endif\n#endif",
	specularmap_fragment: "float specularStrength;\n#ifdef USE_SPECULARMAP\n	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );\n	specularStrength = texelSpecular.r;\n#else\n	specularStrength = 1.0;\n#endif",
	specularmap_pars_fragment: "#ifdef USE_SPECULARMAP\n	uniform sampler2D specularMap;\n#endif",
	tonemapping_fragment: "#if defined( TONE_MAPPING )\n	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif",
	tonemapping_pars_fragment: "#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nvec3 LinearToneMapping( vec3 color ) {\n	return saturate( toneMappingExposure * color );\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	return saturate( color / ( vec3( 1.0 ) + color ) );\n}\nvec3 CineonToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	color = max( vec3( 0.0 ), color - 0.004 );\n	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\nvec3 RRTAndODTFit( vec3 v ) {\n	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;\n	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;\n	return a / b;\n}\nvec3 ACESFilmicToneMapping( vec3 color ) {\n	const mat3 ACESInputMat = mat3(\n		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),\n		vec3( 0.04823, 0.01566, 0.83777 )\n	);\n	const mat3 ACESOutputMat = mat3(\n		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),\n		vec3( -0.07367, -0.00605,  1.07602 )\n	);\n	color *= toneMappingExposure / 0.6;\n	color = ACESInputMat * color;\n	color = RRTAndODTFit( color );\n	color = ACESOutputMat * color;\n	return saturate( color );\n}\nconst mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(\n	vec3( 1.6605, - 0.1246, - 0.0182 ),\n	vec3( - 0.5876, 1.1329, - 0.1006 ),\n	vec3( - 0.0728, - 0.0083, 1.1187 )\n);\nconst mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(\n	vec3( 0.6274, 0.0691, 0.0164 ),\n	vec3( 0.3293, 0.9195, 0.0880 ),\n	vec3( 0.0433, 0.0113, 0.8956 )\n);\nvec3 agxDefaultContrastApprox( vec3 x ) {\n	vec3 x2 = x * x;\n	vec3 x4 = x2 * x2;\n	return + 15.5 * x4 * x2\n		- 40.14 * x4 * x\n		+ 31.96 * x4\n		- 6.868 * x2 * x\n		+ 0.4298 * x2\n		+ 0.1191 * x\n		- 0.00232;\n}\nvec3 AgXToneMapping( vec3 color ) {\n	const mat3 AgXInsetMatrix = mat3(\n		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),\n		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),\n		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )\n	);\n	const mat3 AgXOutsetMatrix = mat3(\n		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),\n		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),\n		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )\n	);\n	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;\n	color *= toneMappingExposure;\n	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;\n	color = AgXInsetMatrix * color;\n	color = max( color, 1e-10 );	color = log2( color );\n	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );\n	color = clamp( color, 0.0, 1.0 );\n	color = agxDefaultContrastApprox( color );\n	color = AgXOutsetMatrix * color;\n	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );\n	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;\n	color = clamp( color, 0.0, 1.0 );\n	return color;\n}\nvec3 NeutralToneMapping( vec3 color ) {\n	const float StartCompression = 0.8 - 0.04;\n	const float Desaturation = 0.15;\n	color *= toneMappingExposure;\n	float x = min( color.r, min( color.g, color.b ) );\n	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n	color -= offset;\n	float peak = max( color.r, max( color.g, color.b ) );\n	if ( peak < StartCompression ) return color;\n	float d = 1. - StartCompression;\n	float newPeak = 1. - d * d / ( peak + d - StartCompression );\n	color *= newPeak / peak;\n	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n	return mix( color, vec3( newPeak ), g );\n}\nvec3 CustomToneMapping( vec3 color ) { return color; }",
	transmission_fragment: "#ifdef USE_TRANSMISSION\n	material.transmission = transmission;\n	material.transmissionAlpha = 1.0;\n	material.thickness = thickness;\n	material.attenuationDistance = attenuationDistance;\n	material.attenuationColor = attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n	#endif\n	vec3 pos = vWorldPosition;\n	vec3 v = normalize( cameraPosition - pos );\n	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec4 transmitted = getIBLVolumeRefraction(\n		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,\n		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,\n		material.attenuationColor, material.attenuationDistance );\n	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif",
	transmission_pars_fragment: "#ifdef USE_TRANSMISSION\n	uniform float transmission;\n	uniform float thickness;\n	uniform float attenuationDistance;\n	uniform vec3 attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		uniform sampler2D transmissionMap;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		uniform sampler2D thicknessMap;\n	#endif\n	uniform vec2 transmissionSamplerSize;\n	uniform sampler2D transmissionSamplerMap;\n	uniform mat4 modelMatrix;\n	uniform mat4 projectionMatrix;\n	varying vec3 vWorldPosition;\n	float w0( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );\n	}\n	float w1( float a ) {\n		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );\n	}\n	float w2( float a ){\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );\n	}\n	float w3( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * a * a );\n	}\n	float g0( float a ) {\n		return w0( a ) + w1( a );\n	}\n	float g1( float a ) {\n		return w2( a ) + w3( a );\n	}\n	float h0( float a ) {\n		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );\n	}\n	float h1( float a ) {\n		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );\n	}\n	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {\n		uv = uv * texelSize.zw + 0.5;\n		vec2 iuv = floor( uv );\n		vec2 fuv = fract( uv );\n		float g0x = g0( fuv.x );\n		float g1x = g1( fuv.x );\n		float h0x = h0( fuv.x );\n		float h1x = h1( fuv.x );\n		float h0y = h0( fuv.y );\n		float h1y = h1( fuv.y );\n		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +\n			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );\n	}\n	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {\n		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );\n		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );\n		vec2 fLodSizeInv = 1.0 / fLodSize;\n		vec2 cLodSizeInv = 1.0 / cLodSize;\n		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );\n		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );\n		return mix( fSample, cSample, fract( lod ) );\n	}\n	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {\n		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );\n		vec3 modelScale;\n		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );\n		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );\n		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );\n		return normalize( refractionVector ) * thickness * modelScale;\n	}\n	float applyIorToRoughness( const in float roughness, const in float ior ) {\n		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );\n	}\n	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {\n		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );\n		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );\n	}\n	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {\n		if ( isinf( attenuationDistance ) ) {\n			return vec3( 1.0 );\n		} else {\n			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;\n			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;\n		}\n	}\n	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,\n		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,\n		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,\n		const in vec3 attenuationColor, const in float attenuationDistance ) {\n		vec4 transmittedLight;\n		vec3 transmittance;\n		#ifdef USE_DISPERSION\n			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;\n			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );\n			for ( int i = 0; i < 3; i ++ ) {\n				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );\n				vec3 refractedRayExit = position + transmissionRay;\n				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n				vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n				refractionCoords += 1.0;\n				refractionCoords /= 2.0;\n				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );\n				transmittedLight[ i ] = transmissionSample[ i ];\n				transmittedLight.a += transmissionSample.a;\n				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];\n			}\n			transmittedLight.a /= 3.0;\n		#else\n			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );\n			vec3 refractedRayExit = position + transmissionRay;\n			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n			vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n			refractionCoords += 1.0;\n			refractionCoords /= 2.0;\n			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );\n			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );\n		#endif\n		vec3 attenuatedColor = transmittance * transmittedLight.rgb;\n		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );\n		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;\n		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );\n	}\n#endif",
	uv_pars_fragment: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_pars_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	uniform mat3 mapTransform;\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform mat3 alphaMapTransform;\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	uniform mat3 lightMapTransform;\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	uniform mat3 aoMapTransform;\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	uniform mat3 bumpMapTransform;\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	uniform mat3 normalMapTransform;\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	uniform mat3 displacementMapTransform;\n	varying vec2 vDisplacementMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	uniform mat3 emissiveMapTransform;\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	uniform mat3 metalnessMapTransform;\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	uniform mat3 roughnessMapTransform;\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	uniform mat3 anisotropyMapTransform;\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	uniform mat3 clearcoatMapTransform;\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform mat3 clearcoatNormalMapTransform;\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform mat3 clearcoatRoughnessMapTransform;\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	uniform mat3 sheenColorMapTransform;\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	uniform mat3 sheenRoughnessMapTransform;\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	uniform mat3 iridescenceMapTransform;\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform mat3 iridescenceThicknessMapTransform;\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	uniform mat3 specularMapTransform;\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	uniform mat3 specularColorMapTransform;\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	uniform mat3 specularIntensityMapTransform;\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	vUv = vec3( uv, 1 ).xy;\n#endif\n#ifdef USE_MAP\n	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ALPHAMAP\n	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_LIGHTMAP\n	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_AOMAP\n	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_BUMPMAP\n	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_NORMALMAP\n	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_EMISSIVEMAP\n	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_METALNESSMAP\n	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOATMAP\n	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULARMAP\n	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_THICKNESSMAP\n	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;\n#endif",
	worldpos_vertex: "#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n	vec4 worldPosition = vec4( transformed, 1.0 );\n	#ifdef USE_BATCHING\n		worldPosition = batchingMatrix * worldPosition;\n	#endif\n	#ifdef USE_INSTANCING\n		worldPosition = instanceMatrix * worldPosition;\n	#endif\n	worldPosition = modelMatrix * worldPosition;\n#endif",
	background_vert: "varying vec2 vUv;\nuniform mat3 uvTransform;\nvoid main() {\n	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	gl_Position = vec4( position.xy, 1.0, 1.0 );\n}",
	background_frag: "uniform sampler2D t2D;\nuniform float backgroundIntensity;\nvarying vec2 vUv;\nvoid main() {\n	vec4 texColor = texture2D( t2D, vUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	backgroundCube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	backgroundCube_frag: "#ifdef ENVMAP_TYPE_CUBE\n	uniform samplerCube envMap;\n#elif defined( ENVMAP_TYPE_CUBE_UV )\n	uniform sampler2D envMap;\n#endif\nuniform float backgroundBlurriness;\nuniform float backgroundIntensity;\nuniform mat3 backgroundRotation;\nvarying vec3 vWorldDirection;\n#include <cube_uv_reflection_fragment>\nvoid main() {\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );\n	#elif defined( ENVMAP_TYPE_CUBE_UV )\n		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );\n	#else\n		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	cube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	cube_frag: "uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldDirection;\nvoid main() {\n	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );\n	gl_FragColor = texColor;\n	gl_FragColor.a *= opacity;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	depth_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vHighPrecisionZW = gl_Position.zw;\n}",
	depth_frag: "#if DEPTH_PACKING == 3200\n	uniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#if DEPTH_PACKING == 3200\n		diffuseColor.a = opacity;\n	#endif\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <logdepthbuf_fragment>\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];\n	#else\n		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;\n	#endif\n	#if DEPTH_PACKING == 3200\n		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );\n	#elif DEPTH_PACKING == 3201\n		gl_FragColor = packDepthToRGBA( fragCoordZ );\n	#elif DEPTH_PACKING == 3202\n		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );\n	#elif DEPTH_PACKING == 3203\n		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );\n	#endif\n}",
	distance_vert: "#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <worldpos_vertex>\n	#include <clipping_planes_vertex>\n	vWorldPosition = worldPosition.xyz;\n}",
	distance_frag: "#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	float dist = length( vWorldPosition - referencePosition );\n	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n	dist = saturate( dist );\n	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );\n}",
	equirect_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n}",
	equirect_frag: "uniform sampler2D tEquirect;\nvarying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vec3 direction = normalize( vWorldDirection );\n	vec2 sampleUV = equirectUv( direction );\n	gl_FragColor = texture2D( tEquirect, sampleUV );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	linedashed_vert: "uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	vLineDistance = scale * lineDistance;\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	linedashed_frag: "uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	if ( mod( vLineDistance, totalSize ) > dashSize ) {\n		discard;\n	}\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	meshbasic_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinbase_vertex>\n		#include <skinnormal_vertex>\n		#include <defaultnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <fog_vertex>\n}",
	meshbasic_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n#endif\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;\n	#else\n		reflectedLight.indirectDiffuse += vec3( 1.0 );\n	#endif\n	#include <aomap_fragment>\n	reflectedLight.indirectDiffuse *= diffuseColor.rgb;\n	vec3 outgoingLight = reflectedLight.indirectDiffuse;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshlambert_vert: "#define LAMBERT\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshlambert_frag: "#define LAMBERT\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_lambert_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshmatcap_vert: "#define MATCAP\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n	vViewPosition = - mvPosition.xyz;\n}",
	meshmatcap_frag: "#define MATCAP\nuniform vec3 diffuse;\nuniform float opacity;\nuniform sampler2D matcap;\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	vec3 viewDir = normalize( vViewPosition );\n	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );\n	vec3 y = cross( viewDir, x );\n	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;\n	#ifdef USE_MATCAP\n		vec4 matcapColor = texture2D( matcap, uv );\n	#else\n		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );\n	#endif\n	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshnormal_vert: "#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}",
	meshnormal_frag: "#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <uv_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );\n	#ifdef OPAQUE\n		gl_FragColor.a = 1.0;\n	#endif\n}",
	meshphong_vert: "#define PHONG\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshphong_frag: "#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_phong_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshphysical_vert: "#define STANDARD\nvarying vec3 vViewPosition;\n#ifdef USE_TRANSMISSION\n	varying vec3 vWorldPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n#ifdef USE_TRANSMISSION\n	vWorldPosition = worldPosition.xyz;\n#endif\n}",
	meshphysical_frag: "#define STANDARD\n#ifdef PHYSICAL\n	#define IOR\n	#define USE_SPECULAR\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef IOR\n	uniform float ior;\n#endif\n#ifdef USE_SPECULAR\n	uniform float specularIntensity;\n	uniform vec3 specularColor;\n	#ifdef USE_SPECULAR_COLORMAP\n		uniform sampler2D specularColorMap;\n	#endif\n	#ifdef USE_SPECULAR_INTENSITYMAP\n		uniform sampler2D specularIntensityMap;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT\n	uniform float clearcoat;\n	uniform float clearcoatRoughness;\n#endif\n#ifdef USE_DISPERSION\n	uniform float dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	uniform float retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	uniform float iridescence;\n	uniform float iridescenceIOR;\n	uniform float iridescenceThicknessMinimum;\n	uniform float iridescenceThicknessMaximum;\n#endif\n#ifdef USE_SHEEN\n	uniform vec3 sheenColor;\n	uniform float sheenRoughness;\n	#ifdef USE_SHEEN_COLORMAP\n		uniform sampler2D sheenColorMap;\n	#endif\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		uniform sampler2D sheenRoughnessMap;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	uniform vec2 anisotropyVector;\n	#ifdef USE_ANISOTROPYMAP\n		uniform sampler2D anisotropyMap;\n	#endif\n#endif\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <iridescence_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_physical_pars_fragment>\n#include <transmission_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <iridescence_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <roughnessmap_fragment>\n	#include <metalnessmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <clearcoat_normal_fragment_begin>\n	#include <clearcoat_normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_physical_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\n	#include <transmission_fragment>\n	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;\n	#ifdef USE_SHEEN\n \n		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;\n \n 	#endif\n	#ifdef USE_CLEARCOAT\n		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );\n		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );\n		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;\n	#endif\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshtoon_vert: "#define TOON\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshtoon_frag: "#define TOON\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_toon_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_toon_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	points_vert: "uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#ifdef USE_POINTS_UV\n	varying vec2 vUv;\n	uniform mat3 uvTransform;\n#endif\nvoid main() {\n	#ifdef USE_POINTS_UV\n		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	#endif\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	gl_PointSize = size;\n	#ifdef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );\n	#endif\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <fog_vertex>\n}",
	points_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_particle_fragment>\n	#include <color_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	shadow_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	shadow_frag: "uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <logdepthbuf_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n	#include <logdepthbuf_fragment>\n	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	sprite_vert: "uniform float rotation;\nuniform vec2 center;\n#include <common>\n#include <uv_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	vec4 mvPosition = modelViewMatrix[ 3 ];\n	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );\n	#ifndef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) scale *= - mvPosition.z;\n	#endif\n	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;\n	vec2 rotatedPosition;\n	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n	mvPosition.xy += rotatedPosition;\n	gl_Position = projectionMatrix * mvPosition;\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	sprite_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}"
};
var UniformsLib = {
	common: {
		diffuse: { value: /*@__PURE__*/ new Color(16777215) },
		opacity: { value: 1 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new Matrix3() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		alphaTest: { value: 0 }
	},
	specularmap: {
		specularMap: { value: null },
		specularMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	envmap: {
		envMap: { value: null },
		envMapRotation: { value: /*@__PURE__*/ new Matrix3() },
		reflectivity: { value: 1 },
		ior: { value: 1.5 },
		refractionRatio: { value: .98 },
		dfgLUT: { value: null }
	},
	aomap: {
		aoMap: { value: null },
		aoMapIntensity: { value: 1 },
		aoMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	lightmap: {
		lightMap: { value: null },
		lightMapIntensity: { value: 1 },
		lightMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	bumpmap: {
		bumpMap: { value: null },
		bumpMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		bumpScale: { value: 1 }
	},
	normalmap: {
		normalMap: { value: null },
		normalMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		normalScale: { value: /*@__PURE__*/ new Vector2(1, 1) }
	},
	displacementmap: {
		displacementMap: { value: null },
		displacementMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		displacementScale: { value: 1 },
		displacementBias: { value: 0 }
	},
	emissivemap: {
		emissiveMap: { value: null },
		emissiveMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	metalnessmap: {
		metalnessMap: { value: null },
		metalnessMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	roughnessmap: {
		roughnessMap: { value: null },
		roughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	gradientmap: { gradientMap: { value: null } },
	fog: {
		fogDensity: { value: 25e-5 },
		fogNear: { value: 1 },
		fogFar: { value: 2e3 },
		fogColor: { value: /*@__PURE__*/ new Color(16777215) }
	},
	lights: {
		ambientLightColor: { value: [] },
		lightProbe: { value: [] },
		sunLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		sunLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		sunShadowMatrix: { value: [] },
		sunShadowCascade: { value: [] },
		directionalLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		directionalLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		directionalShadowMatrix: { value: [] },
		spotLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				direction: {},
				distance: {},
				coneCos: {},
				penumbraCos: {},
				decay: {}
			}
		},
		spotLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		spotLightMap: { value: [] },
		spotLightMatrix: { value: [] },
		pointLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				decay: {},
				distance: {}
			}
		},
		pointLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {},
				shadowCameraNear: {},
				shadowCameraFar: {}
			}
		},
		pointShadowMatrix: { value: [] },
		hemisphereLights: {
			value: [],
			properties: {
				direction: {},
				skyColor: {},
				groundColor: {}
			}
		},
		rectAreaLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				width: {},
				height: {}
			}
		},
		ltc_1: { value: null },
		ltc_2: { value: null },
		probesSH: { value: null },
		probesMin: { value: /*@__PURE__*/ new Vector3() },
		probesMax: { value: /*@__PURE__*/ new Vector3() },
		probesResolution: { value: /*@__PURE__*/ new Vector3() }
	},
	points: {
		diffuse: { value: /*@__PURE__*/ new Color(16777215) },
		opacity: { value: 1 },
		size: { value: 1 },
		scale: { value: 1 },
		map: { value: null },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		alphaTest: { value: 0 },
		uvTransform: { value: /*@__PURE__*/ new Matrix3() }
	},
	sprite: {
		diffuse: { value: /*@__PURE__*/ new Color(16777215) },
		opacity: { value: 1 },
		center: { value: /*@__PURE__*/ new Vector2(.5, .5) },
		rotation: { value: 0 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new Matrix3() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		alphaTest: { value: 0 }
	}
};
var ShaderLib = {
	basic: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.specularmap,
			UniformsLib.envmap,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.fog
		]),
		vertexShader: ShaderChunk.meshbasic_vert,
		fragmentShader: ShaderChunk.meshbasic_frag
	},
	lambert: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.specularmap,
			UniformsLib.envmap,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.emissivemap,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.fog,
			UniformsLib.lights,
			{
				emissive: { value: /*@__PURE__*/ new Color(0) },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: ShaderChunk.meshlambert_vert,
		fragmentShader: ShaderChunk.meshlambert_frag
	},
	phong: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.specularmap,
			UniformsLib.envmap,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.emissivemap,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.fog,
			UniformsLib.lights,
			{
				emissive: { value: /*@__PURE__*/ new Color(0) },
				specular: { value: /*@__PURE__*/ new Color(1118481) },
				shininess: { value: 30 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: ShaderChunk.meshphong_vert,
		fragmentShader: ShaderChunk.meshphong_frag
	},
	standard: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.envmap,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.emissivemap,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.roughnessmap,
			UniformsLib.metalnessmap,
			UniformsLib.fog,
			UniformsLib.lights,
			{
				emissive: { value: /*@__PURE__*/ new Color(0) },
				roughness: { value: 1 },
				metalness: { value: 0 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: ShaderChunk.meshphysical_vert,
		fragmentShader: ShaderChunk.meshphysical_frag
	},
	toon: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.aomap,
			UniformsLib.lightmap,
			UniformsLib.emissivemap,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.gradientmap,
			UniformsLib.fog,
			UniformsLib.lights,
			{ emissive: { value: /*@__PURE__*/ new Color(0) } }
		]),
		vertexShader: ShaderChunk.meshtoon_vert,
		fragmentShader: ShaderChunk.meshtoon_frag
	},
	matcap: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			UniformsLib.fog,
			{ matcap: { value: null } }
		]),
		vertexShader: ShaderChunk.meshmatcap_vert,
		fragmentShader: ShaderChunk.meshmatcap_frag
	},
	points: {
		uniforms: /*@__PURE__*/ mergeUniforms([UniformsLib.points, UniformsLib.fog]),
		vertexShader: ShaderChunk.points_vert,
		fragmentShader: ShaderChunk.points_frag
	},
	dashed: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.fog,
			{
				scale: { value: 1 },
				dashSize: { value: 1 },
				totalSize: { value: 2 }
			}
		]),
		vertexShader: ShaderChunk.linedashed_vert,
		fragmentShader: ShaderChunk.linedashed_frag
	},
	depth: {
		uniforms: /*@__PURE__*/ mergeUniforms([UniformsLib.common, UniformsLib.displacementmap]),
		vertexShader: ShaderChunk.depth_vert,
		fragmentShader: ShaderChunk.depth_frag
	},
	normal: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.bumpmap,
			UniformsLib.normalmap,
			UniformsLib.displacementmap,
			{ opacity: { value: 1 } }
		]),
		vertexShader: ShaderChunk.meshnormal_vert,
		fragmentShader: ShaderChunk.meshnormal_frag
	},
	sprite: {
		uniforms: /*@__PURE__*/ mergeUniforms([UniformsLib.sprite, UniformsLib.fog]),
		vertexShader: ShaderChunk.sprite_vert,
		fragmentShader: ShaderChunk.sprite_frag
	},
	background: {
		uniforms: {
			uvTransform: { value: /*@__PURE__*/ new Matrix3() },
			t2D: { value: null },
			backgroundIntensity: { value: 1 }
		},
		vertexShader: ShaderChunk.background_vert,
		fragmentShader: ShaderChunk.background_frag
	},
	backgroundCube: {
		uniforms: {
			envMap: { value: null },
			backgroundBlurriness: { value: 0 },
			backgroundIntensity: { value: 1 },
			backgroundRotation: { value: /*@__PURE__*/ new Matrix3() }
		},
		vertexShader: ShaderChunk.backgroundCube_vert,
		fragmentShader: ShaderChunk.backgroundCube_frag
	},
	cube: {
		uniforms: {
			tCube: { value: null },
			tFlip: { value: -1 },
			opacity: { value: 1 }
		},
		vertexShader: ShaderChunk.cube_vert,
		fragmentShader: ShaderChunk.cube_frag
	},
	equirect: {
		uniforms: { tEquirect: { value: null } },
		vertexShader: ShaderChunk.equirect_vert,
		fragmentShader: ShaderChunk.equirect_frag
	},
	distance: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.common,
			UniformsLib.displacementmap,
			{
				referencePosition: { value: /*@__PURE__*/ new Vector3() },
				nearDistance: { value: 1 },
				farDistance: { value: 1e3 }
			}
		]),
		vertexShader: ShaderChunk.distance_vert,
		fragmentShader: ShaderChunk.distance_frag
	},
	shadow: {
		uniforms: /*@__PURE__*/ mergeUniforms([
			UniformsLib.lights,
			UniformsLib.fog,
			{
				color: { value: /*@__PURE__*/ new Color(0) },
				opacity: { value: 1 }
			}
		]),
		vertexShader: ShaderChunk.shadow_vert,
		fragmentShader: ShaderChunk.shadow_frag
	}
};
ShaderLib.physical = {
	uniforms: /*@__PURE__*/ mergeUniforms([ShaderLib.standard.uniforms, {
		clearcoat: { value: 0 },
		clearcoatMap: { value: null },
		clearcoatMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		clearcoatNormalMap: { value: null },
		clearcoatNormalMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		clearcoatNormalScale: { value: /*@__PURE__*/ new Vector2(1, 1) },
		clearcoatRoughness: { value: 0 },
		clearcoatRoughnessMap: { value: null },
		clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		dispersion: { value: 0 },
		retroreflectivity: { value: 0 },
		iridescence: { value: 0 },
		iridescenceMap: { value: null },
		iridescenceMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		iridescenceIOR: { value: 1.3 },
		iridescenceThicknessMinimum: { value: 100 },
		iridescenceThicknessMaximum: { value: 400 },
		iridescenceThicknessMap: { value: null },
		iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		sheen: { value: 0 },
		sheenColor: { value: /*@__PURE__*/ new Color(0) },
		sheenColorMap: { value: null },
		sheenColorMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		sheenRoughness: { value: 1 },
		sheenRoughnessMap: { value: null },
		sheenRoughnessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		transmission: { value: 0 },
		transmissionMap: { value: null },
		transmissionMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		transmissionSamplerSize: { value: /*@__PURE__*/ new Vector2() },
		transmissionSamplerMap: { value: null },
		thickness: { value: 0 },
		thicknessMap: { value: null },
		thicknessMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		attenuationDistance: { value: 0 },
		attenuationColor: { value: /*@__PURE__*/ new Color(0) },
		specularColor: { value: /*@__PURE__*/ new Color(1, 1, 1) },
		specularColorMap: { value: null },
		specularColorMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		specularIntensity: { value: 1 },
		specularIntensityMap: { value: null },
		specularIntensityMapTransform: { value: /*@__PURE__*/ new Matrix3() },
		anisotropyVector: { value: /*@__PURE__*/ new Vector2() },
		anisotropyMap: { value: null },
		anisotropyMapTransform: { value: /*@__PURE__*/ new Matrix3() }
	}]),
	vertexShader: ShaderChunk.meshphysical_vert,
	fragmentShader: ShaderChunk.meshphysical_frag
};
var _rgb = {
	r: 0,
	b: 0,
	g: 0
};
var _m1$1 = /*@__PURE__*/ new Matrix4();
var _m$1 = /*@__PURE__*/ new Matrix3();
_m$1.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function WebGLBackground(renderer, environments, state, objects, alpha, premultipliedAlpha) {
	const clearColor = new Color(0);
	let clearAlpha = alpha === true ? 0 : 1;
	let planeMesh;
	let boxMesh;
	let currentBackground = null;
	let currentBackgroundVersion = 0;
	let currentTonemapping = null;
	function getBackground(scene) {
		let background = scene.isScene === true ? scene.background : null;
		if (background && background.isTexture) {
			const usePMREM = scene.backgroundBlurriness > 0;
			background = environments.get(background, usePMREM);
		}
		return background;
	}
	function render(scene) {
		let forceClear = false;
		const background = getBackground(scene);
		if (background === null) setClear(clearColor, clearAlpha);
		else if (background && background.isColor) {
			setClear(background, 1);
			forceClear = true;
		}
		const environmentBlendMode = renderer.xr.getEnvironmentBlendMode();
		if (environmentBlendMode === "additive") state.buffers.color.setClear(0, 0, 0, 1, premultipliedAlpha);
		else if (environmentBlendMode === "alpha-blend") state.buffers.color.setClear(0, 0, 0, 0, premultipliedAlpha);
		if (renderer.autoClear || forceClear) {
			state.buffers.depth.setTest(true);
			state.buffers.depth.setMask(true);
			state.buffers.color.setMask(true);
			renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
		}
	}
	function addToRenderList(renderList, scene) {
		const background = getBackground(scene);
		if (background && (background.isCubeTexture || background.mapping === 306)) {
			if (boxMesh === void 0) {
				boxMesh = new Mesh(new BoxGeometry(1, 1, 1), new ShaderMaterial({
					name: "BackgroundCubeMaterial",
					uniforms: cloneUniforms(ShaderLib.backgroundCube.uniforms),
					vertexShader: ShaderLib.backgroundCube.vertexShader,
					fragmentShader: ShaderLib.backgroundCube.fragmentShader,
					side: 1,
					depthTest: false,
					depthWrite: false,
					fog: false,
					allowOverride: false
				}));
				boxMesh.geometry.deleteAttribute("normal");
				boxMesh.geometry.deleteAttribute("uv");
				boxMesh.onBeforeRender = function(renderer, scene, camera) {
					this.matrixWorld.copyPosition(camera.matrixWorld);
				};
				Object.defineProperty(boxMesh.material, "envMap", { get: function() {
					return this.uniforms.envMap.value;
				} });
				objects.update(boxMesh);
			}
			boxMesh.material.uniforms.envMap.value = background;
			boxMesh.material.uniforms.backgroundBlurriness.value = scene.backgroundBlurriness;
			boxMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
			boxMesh.material.uniforms.backgroundRotation.value.setFromMatrix4(_m1$1.makeRotationFromEuler(scene.backgroundRotation)).transpose();
			if (background.isCubeTexture && background.isRenderTargetTexture === false) boxMesh.material.uniforms.backgroundRotation.value.premultiply(_m$1);
			boxMesh.material.toneMapped = ColorManagement.getTransfer(background.colorSpace) !== SRGBTransfer;
			if (currentBackground !== background || currentBackgroundVersion !== background.version || currentTonemapping !== renderer.toneMapping) {
				boxMesh.material.needsUpdate = true;
				currentBackground = background;
				currentBackgroundVersion = background.version;
				currentTonemapping = renderer.toneMapping;
			}
			boxMesh.layers.enableAll();
			renderList.unshift(boxMesh, boxMesh.geometry, boxMesh.material, 0, 0, null);
		} else if (background && background.isTexture) {
			if (planeMesh === void 0) {
				planeMesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
					name: "BackgroundMaterial",
					uniforms: cloneUniforms(ShaderLib.background.uniforms),
					vertexShader: ShaderLib.background.vertexShader,
					fragmentShader: ShaderLib.background.fragmentShader,
					side: 0,
					depthTest: false,
					depthWrite: false,
					fog: false,
					allowOverride: false
				}));
				planeMesh.geometry.deleteAttribute("normal");
				Object.defineProperty(planeMesh.material, "map", { get: function() {
					return this.uniforms.t2D.value;
				} });
				objects.update(planeMesh);
			}
			planeMesh.material.uniforms.t2D.value = background;
			planeMesh.material.uniforms.backgroundIntensity.value = scene.backgroundIntensity;
			planeMesh.material.toneMapped = ColorManagement.getTransfer(background.colorSpace) !== SRGBTransfer;
			if (background.matrixAutoUpdate === true) background.updateMatrix();
			planeMesh.material.uniforms.uvTransform.value.copy(background.matrix);
			if (currentBackground !== background || currentBackgroundVersion !== background.version || currentTonemapping !== renderer.toneMapping) {
				planeMesh.material.needsUpdate = true;
				currentBackground = background;
				currentBackgroundVersion = background.version;
				currentTonemapping = renderer.toneMapping;
			}
			planeMesh.layers.enableAll();
			renderList.unshift(planeMesh, planeMesh.geometry, planeMesh.material, 0, 0, null);
		}
	}
	function setClear(color, alpha) {
		color.getRGB(_rgb, getUnlitUniformColorSpace(renderer));
		state.buffers.color.setClear(_rgb.r, _rgb.g, _rgb.b, alpha, premultipliedAlpha);
	}
	function dispose() {
		if (boxMesh !== void 0) {
			boxMesh.geometry.dispose();
			boxMesh.material.dispose();
			boxMesh = void 0;
		}
		if (planeMesh !== void 0) {
			planeMesh.geometry.dispose();
			planeMesh.material.dispose();
			planeMesh = void 0;
		}
	}
	return {
		getClearColor: function() {
			return clearColor;
		},
		setClearColor: function(color, alpha = 1) {
			clearColor.set(color);
			clearAlpha = alpha;
			setClear(clearColor, clearAlpha);
		},
		getClearAlpha: function() {
			return clearAlpha;
		},
		setClearAlpha: function(alpha) {
			clearAlpha = alpha;
			setClear(clearColor, clearAlpha);
		},
		render,
		addToRenderList,
		dispose
	};
}
function WebGLBindingStates(gl, attributes) {
	const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	const bindingStates = {};
	const defaultState = createBindingState(null);
	let currentState = defaultState;
	let forceUpdate = false;
	function setup(object, material, program, geometry, index) {
		let updateBuffers = false;
		const state = getBindingState(object, geometry, program, material);
		if (currentState !== state) {
			currentState = state;
			bindVertexArrayObject(currentState.object);
		}
		updateBuffers = needsUpdate(object, geometry, program, index);
		if (updateBuffers) saveCache(object, geometry, program, index);
		if (index !== null) attributes.update(index, gl.ELEMENT_ARRAY_BUFFER);
		if (updateBuffers || forceUpdate) {
			forceUpdate = false;
			setupVertexAttributes(object, material, program, geometry);
			if (index !== null) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, attributes.get(index).buffer);
		}
	}
	function createVertexArrayObject() {
		return gl.createVertexArray();
	}
	function bindVertexArrayObject(vao) {
		return gl.bindVertexArray(vao);
	}
	function deleteVertexArrayObject(vao) {
		return gl.deleteVertexArray(vao);
	}
	function getBindingState(object, geometry, program, material) {
		const wireframe = material.wireframe === true;
		let objectMap = bindingStates[geometry.id];
		if (objectMap === void 0) {
			objectMap = {};
			bindingStates[geometry.id] = objectMap;
		}
		const objectId = object.isInstancedMesh === true ? object.id : 0;
		let programMap = objectMap[objectId];
		if (programMap === void 0) {
			programMap = {};
			objectMap[objectId] = programMap;
		}
		let stateMap = programMap[program.id];
		if (stateMap === void 0) {
			stateMap = {};
			programMap[program.id] = stateMap;
		}
		let state = stateMap[wireframe];
		if (state === void 0) {
			state = createBindingState(createVertexArrayObject());
			stateMap[wireframe] = state;
		}
		return state;
	}
	function createBindingState(vao) {
		const newAttributes = [];
		const enabledAttributes = [];
		const attributeDivisors = [];
		for (let i = 0; i < maxVertexAttributes; i++) {
			newAttributes[i] = 0;
			enabledAttributes[i] = 0;
			attributeDivisors[i] = 0;
		}
		return {
			geometry: null,
			program: null,
			wireframe: false,
			newAttributes,
			enabledAttributes,
			attributeDivisors,
			object: vao,
			attributes: {},
			index: null
		};
	}
	function needsUpdate(object, geometry, program, index) {
		const cachedAttributes = currentState.attributes;
		const geometryAttributes = geometry.attributes;
		let attributesNum = 0;
		const programAttributes = program.getAttributes();
		for (const name in programAttributes) if (programAttributes[name].location >= 0) {
			const cachedAttribute = cachedAttributes[name];
			let geometryAttribute = geometryAttributes[name];
			if (geometryAttribute === void 0) {
				if (name === "instanceMatrix" && object.instanceMatrix) geometryAttribute = object.instanceMatrix;
				if (name === "instanceColor" && object.instanceColor) geometryAttribute = object.instanceColor;
			}
			if (cachedAttribute === void 0) return true;
			if (cachedAttribute.attribute !== geometryAttribute) return true;
			if (geometryAttribute && cachedAttribute.data !== geometryAttribute.data) return true;
			attributesNum++;
		}
		if (currentState.attributesNum !== attributesNum) return true;
		if (currentState.index !== index) return true;
		return false;
	}
	function saveCache(object, geometry, program, index) {
		const cache = {};
		const attributes = geometry.attributes;
		let attributesNum = 0;
		const programAttributes = program.getAttributes();
		for (const name in programAttributes) if (programAttributes[name].location >= 0) {
			let attribute = attributes[name];
			if (attribute === void 0) {
				if (name === "instanceMatrix" && object.instanceMatrix) attribute = object.instanceMatrix;
				if (name === "instanceColor" && object.instanceColor) attribute = object.instanceColor;
			}
			const data = {};
			data.attribute = attribute;
			if (attribute && attribute.data) data.data = attribute.data;
			cache[name] = data;
			attributesNum++;
		}
		currentState.attributes = cache;
		currentState.attributesNum = attributesNum;
		currentState.index = index;
	}
	function initAttributes() {
		const newAttributes = currentState.newAttributes;
		for (let i = 0, il = newAttributes.length; i < il; i++) newAttributes[i] = 0;
	}
	function enableAttribute(attribute) {
		enableAttributeAndDivisor(attribute, 0);
	}
	function enableAttributeAndDivisor(attribute, meshPerAttribute) {
		const newAttributes = currentState.newAttributes;
		const enabledAttributes = currentState.enabledAttributes;
		const attributeDivisors = currentState.attributeDivisors;
		newAttributes[attribute] = 1;
		if (enabledAttributes[attribute] === 0) {
			gl.enableVertexAttribArray(attribute);
			enabledAttributes[attribute] = 1;
		}
		if (attributeDivisors[attribute] !== meshPerAttribute) {
			gl.vertexAttribDivisor(attribute, meshPerAttribute);
			attributeDivisors[attribute] = meshPerAttribute;
		}
	}
	function disableUnusedAttributes() {
		const newAttributes = currentState.newAttributes;
		const enabledAttributes = currentState.enabledAttributes;
		for (let i = 0, il = enabledAttributes.length; i < il; i++) if (enabledAttributes[i] !== newAttributes[i]) {
			gl.disableVertexAttribArray(i);
			enabledAttributes[i] = 0;
		}
	}
	function vertexAttribPointer(index, size, type, normalized, stride, offset, integer) {
		if (integer === true) gl.vertexAttribIPointer(index, size, type, stride, offset);
		else gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
	}
	function setupVertexAttributes(object, material, program, geometry) {
		initAttributes();
		const geometryAttributes = geometry.attributes;
		const programAttributes = program.getAttributes();
		const materialDefaultAttributeValues = material.defaultAttributeValues;
		for (const name in programAttributes) {
			const programAttribute = programAttributes[name];
			if (programAttribute.location >= 0) {
				let geometryAttribute = geometryAttributes[name];
				if (geometryAttribute === void 0) {
					if (name === "instanceMatrix" && object.instanceMatrix) geometryAttribute = object.instanceMatrix;
					if (name === "instanceColor" && object.instanceColor) geometryAttribute = object.instanceColor;
				}
				if (geometryAttribute !== void 0) {
					const normalized = geometryAttribute.normalized;
					const size = geometryAttribute.itemSize;
					const attribute = attributes.get(geometryAttribute);
					if (attribute === void 0) continue;
					const buffer = attribute.buffer;
					const type = attribute.type;
					const bytesPerElement = attribute.bytesPerElement;
					const integer = type === gl.INT || type === gl.UNSIGNED_INT || geometryAttribute.gpuType === 1013;
					if (geometryAttribute.isInterleavedBufferAttribute) {
						const data = geometryAttribute.data;
						const stride = data.stride;
						const offset = geometryAttribute.offset;
						if (data.isInstancedInterleavedBuffer) {
							for (let i = 0; i < programAttribute.locationSize; i++) enableAttributeAndDivisor(programAttribute.location + i, data.meshPerAttribute);
							if (object.isInstancedMesh !== true && geometry._maxInstanceCount === void 0) geometry._maxInstanceCount = data.meshPerAttribute * data.count;
						} else for (let i = 0; i < programAttribute.locationSize; i++) enableAttribute(programAttribute.location + i);
						gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
						for (let i = 0; i < programAttribute.locationSize; i++) vertexAttribPointer(programAttribute.location + i, size / programAttribute.locationSize, type, normalized, stride * bytesPerElement, (offset + size / programAttribute.locationSize * i) * bytesPerElement, integer);
					} else {
						if (geometryAttribute.isInstancedBufferAttribute) {
							for (let i = 0; i < programAttribute.locationSize; i++) enableAttributeAndDivisor(programAttribute.location + i, geometryAttribute.meshPerAttribute);
							if (object.isInstancedMesh !== true && geometry._maxInstanceCount === void 0) geometry._maxInstanceCount = geometryAttribute.meshPerAttribute * geometryAttribute.count;
						} else for (let i = 0; i < programAttribute.locationSize; i++) enableAttribute(programAttribute.location + i);
						gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
						for (let i = 0; i < programAttribute.locationSize; i++) vertexAttribPointer(programAttribute.location + i, size / programAttribute.locationSize, type, normalized, size * bytesPerElement, size / programAttribute.locationSize * i * bytesPerElement, integer);
					}
				} else if (materialDefaultAttributeValues !== void 0) {
					const value = materialDefaultAttributeValues[name];
					if (value !== void 0) switch (value.length) {
						case 2:
							gl.vertexAttrib2fv(programAttribute.location, value);
							break;
						case 3:
							gl.vertexAttrib3fv(programAttribute.location, value);
							break;
						case 4:
							gl.vertexAttrib4fv(programAttribute.location, value);
							break;
						default: gl.vertexAttrib1fv(programAttribute.location, value);
					}
				}
			}
		}
		disableUnusedAttributes();
	}
	function dispose() {
		reset();
		for (const geometryId in bindingStates) {
			const objectMap = bindingStates[geometryId];
			for (const objectId in objectMap) {
				const programMap = objectMap[objectId];
				for (const programId in programMap) {
					const stateMap = programMap[programId];
					for (const wireframe in stateMap) {
						deleteVertexArrayObject(stateMap[wireframe].object);
						delete stateMap[wireframe];
					}
					delete programMap[programId];
				}
			}
			delete bindingStates[geometryId];
		}
	}
	function releaseStatesOfGeometry(geometry) {
		if (bindingStates[geometry.id] === void 0) return;
		const objectMap = bindingStates[geometry.id];
		for (const objectId in objectMap) {
			const programMap = objectMap[objectId];
			for (const programId in programMap) {
				const stateMap = programMap[programId];
				for (const wireframe in stateMap) {
					deleteVertexArrayObject(stateMap[wireframe].object);
					delete stateMap[wireframe];
				}
				delete programMap[programId];
			}
		}
		delete bindingStates[geometry.id];
	}
	function releaseStatesOfProgram(program) {
		for (const geometryId in bindingStates) {
			const objectMap = bindingStates[geometryId];
			for (const objectId in objectMap) {
				const programMap = objectMap[objectId];
				if (programMap[program.id] === void 0) continue;
				const stateMap = programMap[program.id];
				for (const wireframe in stateMap) {
					deleteVertexArrayObject(stateMap[wireframe].object);
					delete stateMap[wireframe];
				}
				delete programMap[program.id];
			}
		}
	}
	function releaseStatesOfObject(object) {
		for (const geometryId in bindingStates) {
			const objectMap = bindingStates[geometryId];
			const objectId = object.isInstancedMesh === true ? object.id : 0;
			const programMap = objectMap[objectId];
			if (programMap === void 0) continue;
			for (const programId in programMap) {
				const stateMap = programMap[programId];
				for (const wireframe in stateMap) {
					deleteVertexArrayObject(stateMap[wireframe].object);
					delete stateMap[wireframe];
				}
				delete programMap[programId];
			}
			delete objectMap[objectId];
			if (Object.keys(objectMap).length === 0) delete bindingStates[geometryId];
		}
	}
	function reset() {
		resetDefaultState();
		forceUpdate = true;
		if (currentState === defaultState) return;
		currentState = defaultState;
		bindVertexArrayObject(currentState.object);
	}
	function resetDefaultState() {
		defaultState.geometry = null;
		defaultState.program = null;
		defaultState.wireframe = false;
	}
	return {
		setup,
		reset,
		resetDefaultState,
		dispose,
		releaseStatesOfGeometry,
		releaseStatesOfObject,
		releaseStatesOfProgram,
		initAttributes,
		enableAttribute,
		disableUnusedAttributes
	};
}
function WebGLBufferRenderer(gl, extensions, info) {
	let mode;
	function setMode(value) {
		mode = value;
	}
	function render(start, count) {
		gl.drawArrays(mode, start, count);
		info.update(count, mode, 1);
	}
	function renderInstances(start, count, primcount) {
		if (primcount === 0) return;
		gl.drawArraysInstanced(mode, start, count, primcount);
		info.update(count, mode, primcount);
	}
	function renderMultiDraw(starts, counts, drawCount) {
		if (drawCount === 0) return;
		extensions.get("WEBGL_multi_draw").multiDrawArraysWEBGL(mode, starts, 0, counts, 0, drawCount);
		let elementCount = 0;
		for (let i = 0; i < drawCount; i++) elementCount += counts[i];
		info.update(elementCount, mode, 1);
	}
	this.setMode = setMode;
	this.render = render;
	this.renderInstances = renderInstances;
	this.renderMultiDraw = renderMultiDraw;
}
function WebGLCapabilities(gl, extensions, parameters, utils) {
	let maxAnisotropy;
	function getMaxAnisotropy() {
		if (maxAnisotropy !== void 0) return maxAnisotropy;
		if (extensions.has("EXT_texture_filter_anisotropic") === true) {
			const extension = extensions.get("EXT_texture_filter_anisotropic");
			maxAnisotropy = gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		} else maxAnisotropy = 0;
		return maxAnisotropy;
	}
	function textureFormatReadable(textureFormat) {
		if (textureFormat !== 1023 && utils.convert(textureFormat) !== gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)) return false;
		return true;
	}
	function textureTypeReadable(textureType) {
		const halfFloatSupportedByExt = textureType === 1016 && (extensions.has("EXT_color_buffer_half_float") || extensions.has("EXT_color_buffer_float"));
		if (textureType !== 1009 && textureType !== 1015 && !halfFloatSupportedByExt && utils.convert(textureType) !== gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)) return false;
		return true;
	}
	function getMaxPrecision(precision) {
		if (precision === "highp") {
			if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT).precision > 0 && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) return "highp";
			precision = "mediump";
		}
		if (precision === "mediump") {
			if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT).precision > 0 && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).precision > 0) return "mediump";
		}
		return "lowp";
	}
	let precision = parameters.precision !== void 0 ? parameters.precision : "highp";
	const maxPrecision = getMaxPrecision(precision);
	if (maxPrecision !== precision) {
		warn("WebGLRenderer:", precision, "not supported, using", maxPrecision, "instead.");
		precision = maxPrecision;
	}
	const logarithmicDepthBuffer = parameters.logarithmicDepthBuffer === true;
	const reversedDepthBuffer = parameters.reversedDepthBuffer === true && extensions.has("EXT_clip_control");
	if (parameters.reversedDepthBuffer === true && reversedDepthBuffer === false) warn("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");
	const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
	const maxVertexTextures = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
	const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	const maxCubemapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
	const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
	const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
	const maxFragmentUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
	const maxSamples = gl.getParameter(gl.MAX_SAMPLES);
	const samples = gl.getParameter(gl.SAMPLES);
	return {
		isWebGL2: true,
		getMaxAnisotropy,
		getMaxPrecision,
		textureFormatReadable,
		textureTypeReadable,
		precision,
		logarithmicDepthBuffer,
		reversedDepthBuffer,
		maxTextures,
		maxVertexTextures,
		maxTextureSize,
		maxCubemapSize,
		maxAttributes,
		maxVertexUniforms,
		maxVaryings,
		maxFragmentUniforms,
		maxSamples,
		samples
	};
}
function WebGLClipping(properties) {
	const scope = this;
	let globalState = null, numGlobalPlanes = 0, localClippingEnabled = false, renderingShadows = false;
	const plane = new Plane(), viewNormalMatrix = new Matrix3(), uniform = {
		value: null,
		needsUpdate: false
	};
	this.uniform = uniform;
	this.numPlanes = 0;
	this.numIntersection = 0;
	this.init = function(planes, enableLocalClipping) {
		const enabled = planes.length !== 0 || enableLocalClipping || numGlobalPlanes !== 0 || localClippingEnabled;
		localClippingEnabled = enableLocalClipping;
		numGlobalPlanes = planes.length;
		return enabled;
	};
	this.beginShadows = function() {
		renderingShadows = true;
		projectPlanes(null);
	};
	this.endShadows = function() {
		renderingShadows = false;
	};
	this.setGlobalState = function(planes, camera) {
		globalState = projectPlanes(planes, camera, 0);
	};
	this.setState = function(material, camera, useCache) {
		const planes = material.clippingPlanes, clipIntersection = material.clipIntersection, clipShadows = material.clipShadows;
		const materialProperties = properties.get(material);
		if (!localClippingEnabled || planes === null || planes.length === 0 || renderingShadows && !clipShadows) {
			if (renderingShadows) projectPlanes(null);
			else resetGlobalState();
		} else {
			const nGlobal = renderingShadows ? 0 : numGlobalPlanes, lGlobal = nGlobal * 4;
			let dstArray = materialProperties.clippingState || null;
			uniform.value = dstArray;
			dstArray = projectPlanes(planes, camera, lGlobal, useCache);
			for (let i = 0; i !== lGlobal; ++i) dstArray[i] = globalState[i];
			materialProperties.clippingState = dstArray;
			this.numIntersection = clipIntersection ? this.numPlanes : 0;
			this.numPlanes += nGlobal;
		}
	};
	function resetGlobalState() {
		if (uniform.value !== globalState) {
			uniform.value = globalState;
			uniform.needsUpdate = numGlobalPlanes > 0;
		}
		scope.numPlanes = numGlobalPlanes;
		scope.numIntersection = 0;
	}
	function projectPlanes(planes, camera, dstOffset, skipTransform) {
		const nPlanes = planes !== null ? planes.length : 0;
		let dstArray = null;
		if (nPlanes !== 0) {
			dstArray = uniform.value;
			if (skipTransform !== true || dstArray === null) {
				const flatSize = dstOffset + nPlanes * 4, viewMatrix = camera.matrixWorldInverse;
				viewNormalMatrix.getNormalMatrix(viewMatrix);
				if (dstArray === null || dstArray.length < flatSize) dstArray = new Float32Array(flatSize);
				for (let i = 0, i4 = dstOffset; i !== nPlanes; ++i, i4 += 4) {
					plane.copy(planes[i]).applyMatrix4(viewMatrix, viewNormalMatrix);
					plane.normal.toArray(dstArray, i4);
					dstArray[i4 + 3] = plane.constant;
				}
			}
			uniform.value = dstArray;
			uniform.needsUpdate = true;
		}
		scope.numPlanes = nPlanes;
		scope.numIntersection = 0;
		return dstArray;
	}
}
var LOD_MIN = 4;
var EXTRA_LODS = 6;
var BLUR_SAMPLES = 20;
var GGX_SAMPLES = 256;
var _flatCamera = /*@__PURE__*/ new OrthographicCamera();
var _clearColor = /*@__PURE__*/ new Color();
var _oldTarget = null;
var _oldActiveCubeFace = 0;
var _oldActiveMipmapLevel = 0;
var _oldXrEnabled = false;
var _origin = /*@__PURE__*/ new Vector3();
var _direction = /*@__PURE__*/ new Vector3();
/**
* This class generates a Prefiltered, Mipmapped Radiance Environment Map
* (PMREM) from a cubeMap environment texture. This allows different levels of
* blur to be quickly accessed based on material roughness. It is packed into a
* special CubeUV format that allows us to perform custom interpolation so that
* we can support nonlinear formats such as RGBE. Unlike a traditional mipmap
* chain, it only goes down to the LOD_MIN level (above), and then creates extra
* even more filtered 'mips' at the same LOD_MIN resolution, associated with
* higher roughness levels. In this way we maintain resolution to smoothly
* interpolate diffuse lighting while limiting sampling computation.
*
* The prefiltering uses GGX VNDF (Visible Normal Distribution Function)
* importance sampling based on "Sampling the GGX Distribution of Visible Normals"
* (Heitz, 2018) to generate environment maps that accurately match the GGX BRDF
* used in material rendering for physically-based image-based lighting.
*/
var PMREMGenerator = class {
	/**
	* Constructs a new PMREM generator.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	*/
	constructor(renderer) {
		this._renderer = renderer;
		this._pingPongRenderTarget = null;
		this._lodMax = 0;
		this._cubeSize = 0;
		this._sizeLods = [];
		this._lodMeshes = [];
		this._backgroundBox = null;
		this._cubemapMaterial = null;
		this._equirectMaterial = null;
		this._blurMaterial = null;
		this._ggxMaterial = null;
	}
	/**
	* Generates a PMREM from a supplied Scene, which can be faster than using an
	* image if networking bandwidth is low. Optional sigma specifies a blur radius
	* in radians to be applied to the scene before PMREM generation. Optional near
	* and far planes ensure the scene is rendered in its entirety.
	*
	* @param {Scene} scene - The scene to be captured.
	* @param {number} [sigma=0] - The blur radius in radians.
	* @param {number} [near=0.1] - The near plane distance.
	* @param {number} [far=100] - The far plane distance.
	* @param {Object} [options={}] - The configuration options.
	* @param {number} [options.size=256] - The texture size of the PMREM.
	* @param {Vector3} [options.position=origin] - The position of the internal cube camera that renders the scene.
	* @return {WebGLRenderTarget} The resulting PMREM.
	*/
	fromScene(scene, sigma = 0, near = .1, far = 100, options = {}) {
		const { size = 256, position = _origin } = options;
		_oldTarget = this._renderer.getRenderTarget();
		_oldActiveCubeFace = this._renderer.getActiveCubeFace();
		_oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();
		_oldXrEnabled = this._renderer.xr.enabled;
		this._renderer.xr.enabled = false;
		this._setSize(size);
		const cubeUVRenderTarget = this._allocateTargets();
		cubeUVRenderTarget.depthBuffer = true;
		this._sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position);
		if (sigma > 0) this._blur(cubeUVRenderTarget, 0, 0, sigma);
		this._applyPMREM(cubeUVRenderTarget);
		this._cleanup(cubeUVRenderTarget);
		return cubeUVRenderTarget;
	}
	/**
	* Generates a PMREM from an equirectangular texture, which can be either LDR
	* or HDR. The ideal input image size is 1k (1024 x 512), as this matches best
	* with the 256 x 256 cubemap output. The minimum supported input image size
	* is 64 x 32.
	*
	* @param {Texture} equirectangular - The equirectangular texture to be converted.
	* @param {?WebGLRenderTarget} [renderTarget=null] - The render target to use.
	* @return {WebGLRenderTarget} The resulting PMREM.
	*/
	fromEquirectangular(equirectangular, renderTarget = null) {
		return this._fromTexture(equirectangular, renderTarget);
	}
	/**
	* Generates a PMREM from an cubemap texture, which can be either LDR
	* or HDR. The ideal input cube size is 256 x 256, as this matches best
	* with the 256 x 256 cubemap output. The minimum supported input cube
	* size is 16 x 16 per face.
	*
	* @param {Texture} cubemap - The cubemap texture to be converted.
	* @param {?WebGLRenderTarget} [renderTarget=null] - The render target to use.
	* @return {WebGLRenderTarget} The resulting PMREM.
	*/
	fromCubemap(cubemap, renderTarget = null) {
		return this._fromTexture(cubemap, renderTarget);
	}
	/**
	* Pre-compiles the cubemap shader. You can get faster start-up by invoking this method during
	* your texture's network fetch for increased concurrency.
	*/
	compileCubemapShader() {
		if (this._cubemapMaterial === null) {
			this._cubemapMaterial = _getCubemapMaterial();
			this._compileMaterial(this._cubemapMaterial);
		}
	}
	/**
	* Pre-compiles the equirectangular shader. You can get faster start-up by invoking this method during
	* your texture's network fetch for increased concurrency.
	*/
	compileEquirectangularShader() {
		if (this._equirectMaterial === null) {
			this._equirectMaterial = _getEquirectMaterial();
			this._compileMaterial(this._equirectMaterial);
		}
	}
	/**
	* Disposes of the PMREMGenerator's internal memory. Note that PMREMGenerator is a static class,
	* so you should not need more than one PMREMGenerator object. If you do, calling dispose() on
	* one of them will cause any others to also become unusable.
	*/
	dispose() {
		this._dispose();
		if (this._cubemapMaterial !== null) this._cubemapMaterial.dispose();
		if (this._equirectMaterial !== null) this._equirectMaterial.dispose();
		if (this._backgroundBox !== null) {
			this._backgroundBox.geometry.dispose();
			this._backgroundBox.material.dispose();
		}
	}
	_setSize(cubeSize) {
		this._lodMax = Math.floor(Math.log2(cubeSize));
		this._cubeSize = Math.pow(2, this._lodMax);
	}
	_dispose() {
		if (this._blurMaterial !== null) this._blurMaterial.dispose();
		if (this._ggxMaterial !== null) this._ggxMaterial.dispose();
		if (this._pingPongRenderTarget !== null) this._pingPongRenderTarget.dispose();
		for (let i = 0; i < this._lodMeshes.length; i++) this._lodMeshes[i].geometry.dispose();
	}
	_cleanup(outputTarget) {
		this._renderer.setRenderTarget(_oldTarget, _oldActiveCubeFace, _oldActiveMipmapLevel);
		this._renderer.xr.enabled = _oldXrEnabled;
		outputTarget.scissorTest = false;
		_setViewport(outputTarget, 0, 0, outputTarget.width, outputTarget.height);
	}
	_fromTexture(texture, renderTarget) {
		if (texture.mapping === 301 || texture.mapping === 302) this._setSize(texture.image.length === 0 ? 16 : texture.image[0].width || texture.image[0].image.width);
		else this._setSize(texture.image.width / 4);
		_oldTarget = this._renderer.getRenderTarget();
		_oldActiveCubeFace = this._renderer.getActiveCubeFace();
		_oldActiveMipmapLevel = this._renderer.getActiveMipmapLevel();
		_oldXrEnabled = this._renderer.xr.enabled;
		this._renderer.xr.enabled = false;
		const cubeUVRenderTarget = renderTarget || this._allocateTargets();
		this._textureToCubeUV(texture, cubeUVRenderTarget);
		this._applyPMREM(cubeUVRenderTarget);
		this._cleanup(cubeUVRenderTarget);
		return cubeUVRenderTarget;
	}
	_allocateTargets() {
		const width = 3 * Math.max(this._cubeSize, 112);
		const height = 4 * this._cubeSize;
		const params = {
			magFilter: LinearFilter,
			minFilter: LinearFilter,
			generateMipmaps: false,
			type: HalfFloatType,
			format: RGBAFormat,
			colorSpace: LinearSRGBColorSpace,
			depthBuffer: false
		};
		const cubeUVRenderTarget = _createRenderTarget(width, height, params);
		if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== width || this._pingPongRenderTarget.height !== height) {
			if (this._pingPongRenderTarget !== null) this._dispose();
			this._pingPongRenderTarget = _createRenderTarget(width, height, params);
			const { _lodMax } = this;
			({lodMeshes: this._lodMeshes, sizeLods: this._sizeLods} = _createPlanes(_lodMax));
			this._blurMaterial = _getBlurShader(_lodMax, width, height);
			this._ggxMaterial = _getGGXShader(_lodMax, width, height);
		}
		return cubeUVRenderTarget;
	}
	_compileMaterial(material) {
		const mesh = new Mesh(new BufferGeometry(), material);
		this._renderer.compile(mesh, _flatCamera);
	}
	_sceneToCubeUV(scene, near, far, cubeUVRenderTarget, position) {
		const cubeCamera = new PerspectiveCamera(90, 1, near, far);
		const upSign = [
			1,
			-1,
			1,
			1,
			1,
			1
		];
		const forwardSign = [
			1,
			1,
			1,
			-1,
			-1,
			-1
		];
		const renderer = this._renderer;
		const originalAutoClear = renderer.autoClear;
		const toneMapping = renderer.toneMapping;
		renderer.getClearColor(_clearColor);
		renderer.toneMapping = 0;
		renderer.autoClear = false;
		if (renderer.state.buffers.depth.getReversed()) {
			renderer.setRenderTarget(cubeUVRenderTarget);
			renderer.clearDepth();
			renderer.setRenderTarget(null);
		}
		if (this._backgroundBox === null) this._backgroundBox = new Mesh(new BoxGeometry(), new MeshBasicMaterial({
			name: "PMREM.Background",
			side: 1,
			depthWrite: false,
			depthTest: false
		}));
		const backgroundBox = this._backgroundBox;
		const backgroundMaterial = backgroundBox.material;
		let useSolidColor = false;
		const background = scene.background;
		if (background) {
			if (background.isColor) {
				backgroundMaterial.color.copy(background);
				scene.background = null;
				useSolidColor = true;
			}
		} else {
			backgroundMaterial.color.copy(_clearColor);
			useSolidColor = true;
		}
		for (let i = 0; i < 6; i++) {
			const col = i % 3;
			if (col === 0) {
				cubeCamera.up.set(0, upSign[i], 0);
				cubeCamera.position.set(position.x, position.y, position.z);
				cubeCamera.lookAt(position.x + forwardSign[i], position.y, position.z);
			} else if (col === 1) {
				cubeCamera.up.set(0, 0, upSign[i]);
				cubeCamera.position.set(position.x, position.y, position.z);
				cubeCamera.lookAt(position.x, position.y + forwardSign[i], position.z);
			} else {
				cubeCamera.up.set(0, upSign[i], 0);
				cubeCamera.position.set(position.x, position.y, position.z);
				cubeCamera.lookAt(position.x, position.y, position.z + forwardSign[i]);
			}
			const size = this._cubeSize;
			_setViewport(cubeUVRenderTarget, col * size, i > 2 ? size : 0, size, size);
			renderer.setRenderTarget(cubeUVRenderTarget);
			if (useSolidColor) renderer.render(backgroundBox, cubeCamera);
			renderer.render(scene, cubeCamera);
		}
		renderer.toneMapping = toneMapping;
		renderer.autoClear = originalAutoClear;
		scene.background = background;
	}
	_textureToCubeUV(texture, cubeUVRenderTarget) {
		const renderer = this._renderer;
		const isCubeTexture = texture.mapping === 301 || texture.mapping === 302;
		if (isCubeTexture) {
			if (this._cubemapMaterial === null) this._cubemapMaterial = _getCubemapMaterial();
			this._cubemapMaterial.uniforms.flipEnvMap.value = texture.isRenderTargetTexture === false ? -1 : 1;
		} else if (this._equirectMaterial === null) this._equirectMaterial = _getEquirectMaterial();
		const material = isCubeTexture ? this._cubemapMaterial : this._equirectMaterial;
		const mesh = this._lodMeshes[0];
		mesh.material = material;
		const uniforms = material.uniforms;
		uniforms["envMap"].value = texture;
		const size = this._cubeSize;
		_setViewport(cubeUVRenderTarget, 0, 0, 3 * size, 2 * size);
		renderer.setRenderTarget(cubeUVRenderTarget);
		renderer.render(mesh, _flatCamera);
	}
	_applyPMREM(cubeUVRenderTarget) {
		const renderer = this._renderer;
		const autoClear = renderer.autoClear;
		renderer.autoClear = false;
		const n = this._lodMeshes.length;
		for (let i = 1; i < n; i++) this._applyGGXFilter(cubeUVRenderTarget, i - 1, i);
		renderer.autoClear = autoClear;
	}
	/**
	* Applies GGX VNDF importance sampling filter to generate a prefiltered environment map.
	* Uses Monte Carlo integration with VNDF importance sampling to accurately represent the
	* GGX BRDF for physically-based rendering. Reads from the previous LOD level and
	* applies incremental roughness filtering to avoid over-blurring.
	*
	* @private
	* @param {WebGLRenderTarget} cubeUVRenderTarget
	* @param {number} lodIn - Source LOD level to read from
	* @param {number} lodOut - Target LOD level to write to
	*/
	_applyGGXFilter(cubeUVRenderTarget, lodIn, lodOut) {
		const renderer = this._renderer;
		const pingPongRenderTarget = this._pingPongRenderTarget;
		const ggxMaterial = this._ggxMaterial;
		const ggxMesh = this._lodMeshes[lodOut];
		ggxMesh.material = ggxMaterial;
		const ggxUniforms = ggxMaterial.uniforms;
		const targetRoughness = lodOut / (this._lodMeshes.length - 1);
		const sourceRoughness = lodIn / (this._lodMeshes.length - 1);
		const adjustedRoughness = Math.sqrt(targetRoughness * targetRoughness - sourceRoughness * sourceRoughness) * (targetRoughness * 1.25);
		const { _lodMax } = this;
		const outputSize = this._sizeLods[lodOut];
		const x = 3 * outputSize * (lodOut > _lodMax - LOD_MIN ? lodOut - _lodMax + LOD_MIN : 0);
		const y = 4 * (this._cubeSize - outputSize);
		ggxUniforms["envMap"].value = cubeUVRenderTarget.texture;
		ggxUniforms["roughness"].value = adjustedRoughness;
		ggxUniforms["mipInt"].value = _lodMax - lodIn;
		_setViewport(pingPongRenderTarget, x, y, 3 * outputSize, 2 * outputSize);
		renderer.setRenderTarget(pingPongRenderTarget);
		renderer.render(ggxMesh, _flatCamera);
		ggxUniforms["envMap"].value = pingPongRenderTarget.texture;
		ggxUniforms["roughness"].value = 0;
		ggxUniforms["mipInt"].value = _lodMax - lodOut;
		_setViewport(cubeUVRenderTarget, x, y, 3 * outputSize, 2 * outputSize);
		renderer.setRenderTarget(cubeUVRenderTarget);
		renderer.render(ggxMesh, _flatCamera);
	}
	/**
	* This is a two-pass Gaussian blur for a cubemap. Each pass importance-samples
	* the Gaussian along a spiral kernel (Golden Angle), which distributes samples
	* isotropically on the sphere (no pole artifacts).
	*
	* Used for initial scene blur in fromScene() method when sigma > 0.
	*
	* @private
	* @param {WebGLRenderTarget} cubeUVRenderTarget
	* @param {number} lodIn
	* @param {number} lodOut
	* @param {number} sigma
	*/
	_blur(cubeUVRenderTarget, lodIn, lodOut, sigma) {
		const pingPongRenderTarget = this._pingPongRenderTarget;
		const blurSigma = Math.min(sigma, Math.PI) / Math.SQRT2;
		this._blurPass(cubeUVRenderTarget, pingPongRenderTarget, lodIn, lodOut, blurSigma);
		this._blurPass(pingPongRenderTarget, cubeUVRenderTarget, lodOut, lodOut, blurSigma);
	}
	_blurPass(targetIn, targetOut, lodIn, lodOut, sigmaRadians) {
		const renderer = this._renderer;
		const blurMaterial = this._blurMaterial;
		const blurMesh = this._lodMeshes[lodOut];
		blurMesh.material = blurMaterial;
		const blurUniforms = blurMaterial.uniforms;
		blurUniforms["envMap"].value = targetIn.texture;
		blurUniforms["sigma"].value = sigmaRadians;
		blurUniforms["mipInt"].value = this._lodMax - lodIn;
		const outputSize = this._sizeLods[lodOut];
		_setViewport(targetOut, 3 * outputSize * (lodOut > this._lodMax - LOD_MIN ? lodOut - this._lodMax + LOD_MIN : 0), 4 * (this._cubeSize - outputSize), 3 * outputSize, 2 * outputSize);
		renderer.setRenderTarget(targetOut);
		renderer.render(blurMesh, _flatCamera);
	}
};
function _createPlanes(lodMax) {
	const sizeLods = [];
	const lodMeshes = [];
	let lod = lodMax;
	const totalLods = lodMax - LOD_MIN + 1 + EXTRA_LODS;
	for (let i = 0; i < totalLods; i++) {
		const sizeLod = Math.pow(2, lod);
		sizeLods.push(sizeLod);
		const texelSize = 1 / (sizeLod - 2);
		const min = -texelSize;
		const max = 1 + texelSize;
		const uv1 = [
			min,
			min,
			max,
			min,
			max,
			max,
			min,
			min,
			max,
			max,
			min,
			max
		];
		const cubeFaces = 6;
		const vertices = 6;
		const positionSize = 3;
		const position = /* @__PURE__ */ new Float32Array(108);
		const outputDirection = /* @__PURE__ */ new Float32Array(108);
		for (let face = 0; face < cubeFaces; face++) {
			const x = face % 3 * 2 / 3 - 1;
			const y = face > 2 ? 0 : -1;
			const coordinates = [
				x,
				y,
				0,
				x + 2 / 3,
				y,
				0,
				x + 2 / 3,
				y + 1,
				0,
				x,
				y,
				0,
				x + 2 / 3,
				y + 1,
				0,
				x,
				y + 1,
				0
			];
			position.set(coordinates, 18 * face);
			for (let vertex = 0; vertex < vertices; vertex++) {
				const u = uv1[vertex * 2] * 2 - 1;
				const v = uv1[vertex * 2 + 1] * 2 - 1;
				if (face === 0) _direction.set(1, v, u);
				else if (face === 1) _direction.set(-u, 1, -v);
				else if (face === 2) _direction.set(-u, v, 1);
				else if (face === 3) _direction.set(-1, v, -u);
				else if (face === 4) _direction.set(-u, -1, v);
				else _direction.set(u, v, -1);
				_direction.toArray(outputDirection, (face * vertices + vertex) * positionSize);
			}
		}
		const planes = new BufferGeometry();
		planes.setAttribute("position", new BufferAttribute(position, positionSize));
		planes.setAttribute("outputDirection", new BufferAttribute(outputDirection, positionSize));
		lodMeshes.push(new Mesh(planes, null));
		if (lod > LOD_MIN) lod--;
	}
	return {
		lodMeshes,
		sizeLods
	};
}
function _createRenderTarget(width, height, params) {
	const cubeUVRenderTarget = new WebGLRenderTarget(width, height, params);
	cubeUVRenderTarget.texture.mapping = 306;
	cubeUVRenderTarget.texture.name = "PMREM.cubeUv";
	cubeUVRenderTarget.scissorTest = true;
	return cubeUVRenderTarget;
}
function _setViewport(target, x, y, width, height) {
	target.viewport.set(x, y, width, height);
	target.scissor.set(x, y, width, height);
}
function _getGGXShader(lodMax, width, height) {
	return new ShaderMaterial({
		name: "PMREMGGXConvolution",
		defines: {
			"GGX_SAMPLES": GGX_SAMPLES,
			"CUBEUV_TEXEL_WIDTH": 1 / width,
			"CUBEUV_TEXEL_HEIGHT": 1 / height,
			"CUBEUV_MAX_MIP": `${lodMax}.0`
		},
		uniforms: {
			"envMap": { value: null },
			"roughness": { value: 0 },
			"mipInt": { value: 0 }
		},
		vertexShader: _getCommonVertexShader(),
		fragmentShader: `

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,
		blending: 0,
		depthTest: false,
		depthWrite: false
	});
}
function _getBlurShader(lodMax, width, height) {
	return new ShaderMaterial({
		name: "SphericalGaussianBlur",
		defines: {
			"SAMPLES": BLUR_SAMPLES,
			"CUBEUV_TEXEL_WIDTH": 1 / width,
			"CUBEUV_TEXEL_HEIGHT": 1 / height,
			"CUBEUV_MAX_MIP": `${lodMax}.0`
		},
		uniforms: {
			"envMap": { value: null },
			"sigma": { value: 0 },
			"mipInt": { value: 0 }
		},
		vertexShader: _getCommonVertexShader(),
		fragmentShader: `

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,
		blending: 0,
		depthTest: false,
		depthWrite: false
	});
}
function _getEquirectMaterial() {
	return new ShaderMaterial({
		name: "EquirectangularToCubeUV",
		uniforms: { "envMap": { value: null } },
		vertexShader: _getCommonVertexShader(),
		fragmentShader: `

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,
		blending: 0,
		depthTest: false,
		depthWrite: false
	});
}
function _getCubemapMaterial() {
	return new ShaderMaterial({
		name: "CubemapToCubeUV",
		uniforms: {
			"envMap": { value: null },
			"flipEnvMap": { value: -1 }
		},
		vertexShader: _getCommonVertexShader(),
		fragmentShader: `

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,
		blending: 0,
		depthTest: false,
		depthWrite: false
	});
}
function _getCommonVertexShader() {
	return `

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`;
}
/**
* A cube render target used in context of {@link WebGLRenderer}.
*
* @augments WebGLRenderTarget
*/
var WebGLCubeRenderTarget = class extends WebGLRenderTarget {
	/**
	* Constructs a new cube render target.
	*
	* @param {number} [size=1] - The size of the render target.
	* @param {RenderTarget~Options} [options] - The configuration object.
	*/
	constructor(size = 1, options = {}) {
		super(size, size, options);
		/**
		* This flag can be used for type testing.
		*
		* @type {boolean}
		* @readonly
		* @default true
		*/
		this.isWebGLCubeRenderTarget = true;
		const image = {
			width: size,
			height: size,
			depth: 1
		};
		const images = [
			image,
			image,
			image,
			image,
			image,
			image
		];
		/**
		* Overwritten with a different texture type.
		*
		* @type {DataArrayTexture}
		*/
		this.texture = new CubeTexture(images);
		this._setTextureOptions(options);
		this.texture.isRenderTargetTexture = true;
	}
	/**
	* Converts the given equirectangular texture to a cube map.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {Texture} texture - The equirectangular texture.
	* @return {WebGLCubeRenderTarget} A reference to this cube render target.
	*/
	fromEquirectangularTexture(renderer, texture) {
		this.texture.type = texture.type;
		this.texture.colorSpace = texture.colorSpace;
		this.texture.generateMipmaps = texture.generateMipmaps;
		this.texture.minFilter = texture.minFilter;
		this.texture.magFilter = texture.magFilter;
		const shader = {
			uniforms: { tEquirect: { value: null } },
			vertexShader: `

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,
			fragmentShader: `

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`
		};
		const geometry = new BoxGeometry(5, 5, 5);
		const material = new ShaderMaterial({
			name: "CubemapFromEquirect",
			uniforms: cloneUniforms(shader.uniforms),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			side: 1,
			blending: 0
		});
		material.uniforms.tEquirect.value = texture;
		const mesh = new Mesh(geometry, material);
		const currentMinFilter = texture.minFilter;
		if (texture.minFilter === 1008) texture.minFilter = LinearFilter;
		new CubeCamera(1, 10, this).update(renderer, mesh);
		texture.minFilter = currentMinFilter;
		mesh.geometry.dispose();
		mesh.material.dispose();
		return this;
	}
	/**
	* Clears this cube render target.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {boolean} [color=true] - Whether the color buffer should be cleared or not.
	* @param {boolean} [depth=true] - Whether the depth buffer should be cleared or not.
	* @param {boolean} [stencil=true] - Whether the stencil buffer should be cleared or not.
	*/
	clear(renderer, color = true, depth = true, stencil = true) {
		const currentRenderTarget = renderer.getRenderTarget();
		for (let i = 0; i < 6; i++) {
			renderer.setRenderTarget(this, i);
			renderer.clear(color, depth, stencil);
		}
		renderer.setRenderTarget(currentRenderTarget);
	}
};
function WebGLEnvironments(renderer) {
	let cubeMaps = /* @__PURE__ */ new WeakMap();
	let pmremMaps = /* @__PURE__ */ new WeakMap();
	let pmremGenerator = null;
	function get(texture, usePMREM = false) {
		if (texture === null || texture === void 0) return null;
		if (usePMREM) return getPMREM(texture);
		return getCube(texture);
	}
	function getCube(texture) {
		if (texture && texture.isTexture) {
			const mapping = texture.mapping;
			if (mapping === 303 || mapping === 304) {
				if (cubeMaps.has(texture)) {
					const cubemap = cubeMaps.get(texture).texture;
					return mapTextureMapping(cubemap, texture.mapping);
				} else {
					const image = texture.image;
					if (image && image.height > 0) {
						const renderTarget = new WebGLCubeRenderTarget(image.height);
						renderTarget.fromEquirectangularTexture(renderer, texture);
						cubeMaps.set(texture, renderTarget);
						texture.addEventListener("dispose", onCubemapDispose);
						return mapTextureMapping(renderTarget.texture, texture.mapping);
					} else return null;
				}
			}
		}
		return texture;
	}
	function getPMREM(texture) {
		if (texture && texture.isTexture) {
			const mapping = texture.mapping;
			const isEquirectMap = mapping === 303 || mapping === 304;
			const isCubeMap = mapping === 301 || mapping === 302;
			if (isEquirectMap || isCubeMap) {
				let renderTarget = pmremMaps.get(texture);
				const currentPMREMVersion = renderTarget !== void 0 ? renderTarget.texture.pmremVersion : 0;
				if (texture.isRenderTargetTexture && texture.pmremVersion !== currentPMREMVersion) {
					if (pmremGenerator === null) pmremGenerator = new PMREMGenerator(renderer);
					renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular(texture, renderTarget) : pmremGenerator.fromCubemap(texture, renderTarget);
					renderTarget.texture.pmremVersion = texture.pmremVersion;
					pmremMaps.set(texture, renderTarget);
					return renderTarget.texture;
				} else if (renderTarget !== void 0) return renderTarget.texture;
				else {
					const image = texture.image;
					if (isEquirectMap && image && image.height > 0 || isCubeMap && image && isCubeTextureComplete(image)) {
						if (pmremGenerator === null) pmremGenerator = new PMREMGenerator(renderer);
						renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular(texture) : pmremGenerator.fromCubemap(texture);
						renderTarget.texture.pmremVersion = texture.pmremVersion;
						pmremMaps.set(texture, renderTarget);
						texture.addEventListener("dispose", onPMREMDispose);
						return renderTarget.texture;
					} else return null;
				}
			}
		}
		return texture;
	}
	function mapTextureMapping(texture, mapping) {
		if (mapping === 303) texture.mapping = 301;
		else if (mapping === 304) texture.mapping = 302;
		return texture;
	}
	function isCubeTextureComplete(image) {
		let count = 0;
		const length = 6;
		for (let i = 0; i < length; i++) if (image[i] !== void 0) count++;
		return count === length;
	}
	function onCubemapDispose(event) {
		const texture = event.target;
		texture.removeEventListener("dispose", onCubemapDispose);
		const cubemap = cubeMaps.get(texture);
		if (cubemap !== void 0) {
			cubeMaps.delete(texture);
			cubemap.dispose();
		}
	}
	function onPMREMDispose(event) {
		const texture = event.target;
		texture.removeEventListener("dispose", onPMREMDispose);
		const pmrem = pmremMaps.get(texture);
		if (pmrem !== void 0) {
			pmremMaps.delete(texture);
			pmrem.dispose();
		}
	}
	function dispose() {
		cubeMaps = /* @__PURE__ */ new WeakMap();
		pmremMaps = /* @__PURE__ */ new WeakMap();
		if (pmremGenerator !== null) {
			pmremGenerator.dispose();
			pmremGenerator = null;
		}
	}
	return {
		get,
		dispose
	};
}
function WebGLExtensions(gl) {
	const extensions = {};
	function getExtension(name) {
		if (extensions[name] !== void 0) return extensions[name];
		const extension = gl.getExtension(name);
		extensions[name] = extension;
		return extension;
	}
	return {
		has: function(name) {
			return getExtension(name) !== null;
		},
		init: function() {
			getExtension("EXT_color_buffer_float");
			getExtension("WEBGL_clip_cull_distance");
			getExtension("OES_texture_float_linear");
			getExtension("EXT_color_buffer_half_float");
			getExtension("WEBGL_multisampled_render_to_texture");
			getExtension("WEBGL_render_shared_exponent");
		},
		get: function(name) {
			const extension = getExtension(name);
			if (extension === null) warnOnce("WebGLRenderer: " + name + " extension not supported.");
			return extension;
		}
	};
}
function WebGLGeometries(gl, attributes, info, bindingStates) {
	const geometries = {};
	const wireframeAttributes = /* @__PURE__ */ new WeakMap();
	function onGeometryDispose(event) {
		const geometry = event.target;
		if (geometry.index !== null) attributes.remove(geometry.index);
		for (const name in geometry.attributes) attributes.remove(geometry.attributes[name]);
		geometry.removeEventListener("dispose", onGeometryDispose);
		delete geometries[geometry.id];
		const attribute = wireframeAttributes.get(geometry);
		if (attribute) {
			attributes.remove(attribute);
			wireframeAttributes.delete(geometry);
		}
		bindingStates.releaseStatesOfGeometry(geometry);
		if (geometry.isInstancedBufferGeometry === true) delete geometry._maxInstanceCount;
		info.memory.geometries--;
	}
	function get(object, geometry) {
		if (geometries[geometry.id] === true) return geometry;
		geometry.addEventListener("dispose", onGeometryDispose);
		geometries[geometry.id] = true;
		info.memory.geometries++;
		return geometry;
	}
	function update(geometry) {
		const geometryAttributes = geometry.attributes;
		for (const name in geometryAttributes) attributes.update(geometryAttributes[name], gl.ARRAY_BUFFER);
	}
	function updateWireframeAttribute(geometry) {
		const indices = [];
		const geometryIndex = geometry.index;
		const geometryPosition = geometry.attributes.position;
		let version = 0;
		if (geometryPosition === void 0) return;
		if (geometryIndex !== null) {
			const array = geometryIndex.array;
			version = geometryIndex.version;
			for (let i = 0, l = array.length; i < l; i += 3) {
				const a = array[i + 0];
				const b = array[i + 1];
				const c = array[i + 2];
				indices.push(a, b, b, c, c, a);
			}
		} else {
			const array = geometryPosition.array;
			version = geometryPosition.version;
			for (let i = 0, l = array.length / 3 - 1; i < l; i += 3) {
				const a = i + 0;
				const b = i + 1;
				const c = i + 2;
				indices.push(a, b, b, c, c, a);
			}
		}
		const attribute = new (geometryPosition.count >= 65535 ? Uint32BufferAttribute : Uint16BufferAttribute)(indices, 1);
		attribute.version = version;
		const previousAttribute = wireframeAttributes.get(geometry);
		if (previousAttribute) attributes.remove(previousAttribute);
		wireframeAttributes.set(geometry, attribute);
	}
	function getWireframeAttribute(geometry) {
		const currentAttribute = wireframeAttributes.get(geometry);
		if (currentAttribute) {
			const geometryIndex = geometry.index;
			if (geometryIndex !== null) {
				if (currentAttribute.version < geometryIndex.version) updateWireframeAttribute(geometry);
			}
		} else updateWireframeAttribute(geometry);
		return wireframeAttributes.get(geometry);
	}
	return {
		get,
		update,
		getWireframeAttribute
	};
}
function WebGLIndexedBufferRenderer(gl, extensions, info) {
	let mode;
	function setMode(value) {
		mode = value;
	}
	let type, bytesPerElement;
	function setIndex(value) {
		type = value.type;
		bytesPerElement = value.bytesPerElement;
	}
	function render(start, count) {
		gl.drawElements(mode, count, type, start * bytesPerElement);
		info.update(count, mode, 1);
	}
	function renderInstances(start, count, primcount) {
		if (primcount === 0) return;
		gl.drawElementsInstanced(mode, count, type, start * bytesPerElement, primcount);
		info.update(count, mode, primcount);
	}
	function renderMultiDraw(starts, counts, drawCount) {
		if (drawCount === 0) return;
		extensions.get("WEBGL_multi_draw").multiDrawElementsWEBGL(mode, counts, 0, type, starts, 0, drawCount);
		let elementCount = 0;
		for (let i = 0; i < drawCount; i++) elementCount += counts[i];
		info.update(elementCount, mode, 1);
	}
	this.setMode = setMode;
	this.setIndex = setIndex;
	this.render = render;
	this.renderInstances = renderInstances;
	this.renderMultiDraw = renderMultiDraw;
}
function WebGLInfo(gl) {
	const memory = {
		geometries: 0,
		textures: 0
	};
	const render = {
		frame: 0,
		calls: 0,
		triangles: 0,
		points: 0,
		lines: 0
	};
	function update(count, mode, instanceCount) {
		render.calls++;
		switch (mode) {
			case gl.TRIANGLES:
				render.triangles += instanceCount * (count / 3);
				break;
			case gl.LINES:
				render.lines += instanceCount * (count / 2);
				break;
			case gl.LINE_STRIP:
				render.lines += instanceCount * (count - 1);
				break;
			case gl.LINE_LOOP:
				render.lines += instanceCount * count;
				break;
			case gl.POINTS:
				render.points += instanceCount * count;
				break;
			default: error("WebGLInfo: Unknown draw mode:", mode);
		}
	}
	function reset() {
		render.calls = 0;
		render.triangles = 0;
		render.points = 0;
		render.lines = 0;
	}
	return {
		memory,
		render,
		programs: null,
		autoReset: true,
		reset,
		update
	};
}
function WebGLMorphtargets(gl, capabilities, textures) {
	const morphTextures = /* @__PURE__ */ new WeakMap();
	const morph = new Vector4();
	function update(object, geometry, program) {
		const objectInfluences = object.morphTargetInfluences;
		const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
		const morphTargetsCount = morphAttribute !== void 0 ? morphAttribute.length : 0;
		let entry = morphTextures.get(geometry);
		if (entry === void 0 || entry.count !== morphTargetsCount) {
			if (entry !== void 0) entry.texture.dispose();
			const hasMorphPosition = geometry.morphAttributes.position !== void 0;
			const hasMorphNormals = geometry.morphAttributes.normal !== void 0;
			const hasMorphColors = geometry.morphAttributes.color !== void 0;
			const morphTargets = geometry.morphAttributes.position || [];
			const morphNormals = geometry.morphAttributes.normal || [];
			const morphColors = geometry.morphAttributes.color || [];
			let vertexDataCount = 0;
			if (hasMorphPosition === true) vertexDataCount = 1;
			if (hasMorphNormals === true) vertexDataCount = 2;
			if (hasMorphColors === true) vertexDataCount = 3;
			let width = geometry.attributes.position.count * vertexDataCount;
			let height = 1;
			if (width > capabilities.maxTextureSize) {
				height = Math.ceil(width / capabilities.maxTextureSize);
				width = capabilities.maxTextureSize;
			}
			const buffer = new Float32Array(width * height * 4 * morphTargetsCount);
			const texture = new DataArrayTexture(buffer, width, height, morphTargetsCount);
			texture.type = FloatType;
			texture.needsUpdate = true;
			const vertexDataStride = vertexDataCount * 4;
			for (let i = 0; i < morphTargetsCount; i++) {
				const morphTarget = morphTargets[i];
				const morphNormal = morphNormals[i];
				const morphColor = morphColors[i];
				const offset = width * height * 4 * i;
				for (let j = 0; j < morphTarget.count; j++) {
					const stride = j * vertexDataStride;
					if (hasMorphPosition === true) {
						morph.fromBufferAttribute(morphTarget, j);
						buffer[offset + stride + 0] = morph.x;
						buffer[offset + stride + 1] = morph.y;
						buffer[offset + stride + 2] = morph.z;
						buffer[offset + stride + 3] = 0;
					}
					if (hasMorphNormals === true) {
						morph.fromBufferAttribute(morphNormal, j);
						buffer[offset + stride + 4] = morph.x;
						buffer[offset + stride + 5] = morph.y;
						buffer[offset + stride + 6] = morph.z;
						buffer[offset + stride + 7] = 0;
					}
					if (hasMorphColors === true) {
						morph.fromBufferAttribute(morphColor, j);
						buffer[offset + stride + 8] = morph.x;
						buffer[offset + stride + 9] = morph.y;
						buffer[offset + stride + 10] = morph.z;
						buffer[offset + stride + 11] = morphColor.itemSize === 4 ? morph.w : 1;
					}
				}
			}
			entry = {
				count: morphTargetsCount,
				texture,
				size: new Vector2(width, height)
			};
			morphTextures.set(geometry, entry);
			function disposeTexture() {
				texture.dispose();
				morphTextures.delete(geometry);
				geometry.removeEventListener("dispose", disposeTexture);
			}
			geometry.addEventListener("dispose", disposeTexture);
		}
		if (object.isInstancedMesh === true && object.morphTexture !== null) program.getUniforms().setValue(gl, "morphTexture", object.morphTexture, textures);
		else {
			let morphInfluencesSum = 0;
			for (let i = 0; i < objectInfluences.length; i++) morphInfluencesSum += objectInfluences[i];
			const morphBaseInfluence = geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;
			program.getUniforms().setValue(gl, "morphTargetBaseInfluence", morphBaseInfluence);
			program.getUniforms().setValue(gl, "morphTargetInfluences", objectInfluences);
		}
		program.getUniforms().setValue(gl, "morphTargetsTexture", entry.texture, textures);
		program.getUniforms().setValue(gl, "morphTargetsTextureSize", entry.size);
	}
	return { update };
}
function WebGLObjects(gl, geometries, attributes, bindingStates, info) {
	let updateMap = /* @__PURE__ */ new WeakMap();
	function update(object) {
		const frame = info.render.frame;
		const geometry = object.geometry;
		const buffergeometry = geometries.get(object, geometry);
		if (updateMap.get(buffergeometry) !== frame) {
			geometries.update(buffergeometry);
			updateMap.set(buffergeometry, frame);
		}
		if (object.isInstancedMesh) {
			if (object.hasEventListener("dispose", onInstancedMeshDispose) === false) object.addEventListener("dispose", onInstancedMeshDispose);
			if (updateMap.get(object) !== frame) {
				attributes.update(object.instanceMatrix, gl.ARRAY_BUFFER);
				if (object.instanceColor !== null) attributes.update(object.instanceColor, gl.ARRAY_BUFFER);
				updateMap.set(object, frame);
			}
		}
		if (object.isSkinnedMesh) {
			const skeleton = object.skeleton;
			if (updateMap.get(skeleton) !== frame) {
				skeleton.update();
				updateMap.set(skeleton, frame);
			}
		}
		return buffergeometry;
	}
	function dispose() {
		updateMap = /* @__PURE__ */ new WeakMap();
	}
	function onInstancedMeshDispose(event) {
		const instancedMesh = event.target;
		instancedMesh.removeEventListener("dispose", onInstancedMeshDispose);
		bindingStates.releaseStatesOfObject(instancedMesh);
		attributes.remove(instancedMesh.instanceMatrix);
		if (instancedMesh.instanceColor !== null) attributes.remove(instancedMesh.instanceColor);
	}
	return {
		update,
		dispose
	};
}
var toneMappingMap = {
	[1]: "LINEAR_TONE_MAPPING",
	[2]: "REINHARD_TONE_MAPPING",
	[3]: "CINEON_TONE_MAPPING",
	[4]: "ACES_FILMIC_TONE_MAPPING",
	[6]: "AGX_TONE_MAPPING",
	[7]: "NEUTRAL_TONE_MAPPING",
	[5]: "CUSTOM_TONE_MAPPING"
};
function WebGLOutput(type, width, height, antialias, depth, stencil) {
	const targetScene = new WebGLRenderTarget(width, height, {
		type,
		depthBuffer: depth,
		stencilBuffer: stencil,
		samples: antialias ? 4 : 0,
		storeMultisampledDepthBuffer: false,
		storeMultisampledStencilBuffer: false,
		resolveDepthBuffer: false,
		resolveStencilBuffer: false
	});
	let targetA = null;
	let targetB = null;
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new Float32BufferAttribute([
		-1,
		3,
		0,
		-1,
		-1,
		0,
		3,
		-1,
		0
	], 3));
	geometry.setAttribute("uv", new Float32BufferAttribute([
		0,
		2,
		0,
		0,
		2,
		0
	], 2));
	const material = new RawShaderMaterial({
		uniforms: { tDiffuse: { value: null } },
		vertexShader: `
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,
		fragmentShader: `
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,
		depthTest: false,
		depthWrite: false
	});
	const mesh = new Mesh(geometry, material);
	const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
	let _outputColorSpace = null;
	let _outputToneMapping = null;
	let _isCompositing = false;
	let _savedToneMapping;
	let _savedRenderTarget = null;
	let _effects = [];
	let _hasRenderPass = false;
	this.setSize = function(width, height) {
		targetScene.setSize(width, height);
		if (targetA !== null) targetA.setSize(width, height);
		if (targetB !== null) targetB.setSize(width, height);
		for (let i = 0; i < _effects.length; i++) {
			const effect = _effects[i];
			if (effect.setSize) effect.setSize(width, height);
		}
	};
	this.setEffects = function(effects) {
		_effects = effects;
		_hasRenderPass = _effects.length > 0 && _effects[0].isRenderPass === true;
		const width = targetScene.width;
		const height = targetScene.height;
		if (_effects.length > 0 && targetA === null) {
			targetA = new WebGLRenderTarget(width, height, {
				type: HalfFloatType,
				depthBuffer: false,
				stencilBuffer: false
			});
			targetB = new WebGLRenderTarget(width, height, {
				type: HalfFloatType,
				depthBuffer: false,
				stencilBuffer: false
			});
		}
		for (let i = 0; i < _effects.length; i++) {
			const effect = _effects[i];
			if (effect.setSize) effect.setSize(width, height);
		}
	};
	this.begin = function(renderer, renderTarget) {
		if (_isCompositing) return false;
		if (renderer.toneMapping === 0 && _effects.length === 0) return false;
		_savedRenderTarget = renderTarget;
		if (renderTarget !== null) {
			const width = renderTarget.width;
			const height = renderTarget.height;
			if (targetScene.width !== width || targetScene.height !== height) this.setSize(width, height);
		}
		if (_hasRenderPass === false) renderer.setRenderTarget(targetScene);
		_savedToneMapping = renderer.toneMapping;
		renderer.toneMapping = 0;
		return true;
	};
	this.hasRenderPass = function() {
		return _hasRenderPass;
	};
	this.end = function(renderer, deltaTime) {
		renderer.toneMapping = _savedToneMapping;
		_isCompositing = true;
		let readBuffer = targetScene;
		let writeBuffer = targetA;
		for (let i = 0; i < _effects.length; i++) {
			const effect = _effects[i];
			if (effect.enabled === false) continue;
			effect.render(renderer, writeBuffer, readBuffer, deltaTime);
			if (effect.needsSwap !== false) {
				readBuffer = writeBuffer;
				writeBuffer = writeBuffer === targetA ? targetB : targetA;
			}
		}
		if (_outputColorSpace !== renderer.outputColorSpace || _outputToneMapping !== renderer.toneMapping) {
			_outputColorSpace = renderer.outputColorSpace;
			_outputToneMapping = renderer.toneMapping;
			material.defines = {};
			if (ColorManagement.getTransfer(_outputColorSpace) === "srgb") material.defines.SRGB_TRANSFER = "";
			const toneMapping = toneMappingMap[_outputToneMapping];
			if (toneMapping) material.defines[toneMapping] = "";
			material.needsUpdate = true;
		}
		material.uniforms.tDiffuse.value = readBuffer.texture;
		renderer.setRenderTarget(_savedRenderTarget);
		renderer.render(mesh, camera);
		_savedRenderTarget = null;
		_isCompositing = false;
	};
	this.isCompositing = function() {
		return _isCompositing;
	};
	this.dispose = function() {
		targetScene.dispose();
		if (targetA !== null) targetA.dispose();
		if (targetB !== null) targetB.dispose();
		geometry.dispose();
		material.dispose();
	};
}
/**
* Uniforms of a program.
* Those form a tree structure with a special top-level container for the root,
* which you get by calling 'new WebGLUniforms( gl, program )'.
*
*
* Properties of inner nodes including the top-level container:
*
* .seq - array of nested uniforms
* .map - nested uniforms by name
*
*
* Methods of all nodes except the top-level container:
*
* .setValue( gl, value, [textures] )
*
* 		uploads a uniform value(s)
*  	the 'textures' parameter is needed for sampler uniforms
*
*
* Static methods of the top-level container (textures factorizations):
*
* .upload( gl, seq, values, textures )
*
* 		sets uniforms in 'seq' to 'values[id].value'
*
* .seqWithValue( seq, values ) : filteredSeq
*
* 		filters 'seq' entries with corresponding entry in values
*
*
* Methods of the top-level container (textures factorizations):
*
* .setValue( gl, name, value, textures )
*
* 		sets uniform with  name 'name' to 'value'
*
* .setOptional( gl, obj, prop )
*
* 		like .set for an optional property of the object
*
*/
var emptyTexture = /*@__PURE__*/ new Texture();
var emptyShadowTexture = /*@__PURE__*/ new DepthTexture(1, 1);
var emptyArrayTexture = /*@__PURE__*/ new DataArrayTexture();
var empty3dTexture = /*@__PURE__*/ new Data3DTexture();
var emptyCubeTexture = /*@__PURE__*/ new CubeTexture();
var arrayCacheF32 = [];
var arrayCacheI32 = [];
var mat4array = /* @__PURE__ */ new Float32Array(16);
var mat3array = /* @__PURE__ */ new Float32Array(9);
var mat2array = /* @__PURE__ */ new Float32Array(4);
function flatten(array, nBlocks, blockSize) {
	const firstElem = array[0];
	if (firstElem <= 0 || firstElem > 0) return array;
	const n = nBlocks * blockSize;
	let r = arrayCacheF32[n];
	if (r === void 0) {
		r = new Float32Array(n);
		arrayCacheF32[n] = r;
	}
	if (nBlocks !== 0) {
		firstElem.toArray(r, 0);
		for (let i = 1, offset = 0; i !== nBlocks; ++i) {
			offset += blockSize;
			array[i].toArray(r, offset);
		}
	}
	return r;
}
function arraysEqual(a, b) {
	if (a.length !== b.length) return false;
	for (let i = 0, l = a.length; i < l; i++) if (a[i] !== b[i]) return false;
	return true;
}
function copyArray(a, b) {
	for (let i = 0, l = b.length; i < l; i++) a[i] = b[i];
}
function allocTexUnits(textures, n) {
	let r = arrayCacheI32[n];
	if (r === void 0) {
		r = new Int32Array(n);
		arrayCacheI32[n] = r;
	}
	for (let i = 0; i !== n; ++i) r[i] = textures.allocateTextureUnit();
	return r;
}
function setValueV1f(gl, v) {
	const cache = this.cache;
	if (cache[0] === v) return;
	gl.uniform1f(this.addr, v);
	cache[0] = v;
}
function setValueV2f(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y) {
			gl.uniform2f(this.addr, v.x, v.y);
			cache[0] = v.x;
			cache[1] = v.y;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform2fv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV3f(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
			gl.uniform3f(this.addr, v.x, v.y, v.z);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
		}
	} else if (v.r !== void 0) {
		if (cache[0] !== v.r || cache[1] !== v.g || cache[2] !== v.b) {
			gl.uniform3f(this.addr, v.r, v.g, v.b);
			cache[0] = v.r;
			cache[1] = v.g;
			cache[2] = v.b;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform3fv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV4f(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
			gl.uniform4f(this.addr, v.x, v.y, v.z, v.w);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
			cache[3] = v.w;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform4fv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueM2(gl, v) {
	const cache = this.cache;
	const elements = v.elements;
	if (elements === void 0) {
		if (arraysEqual(cache, v)) return;
		gl.uniformMatrix2fv(this.addr, false, v);
		copyArray(cache, v);
	} else {
		if (arraysEqual(cache, elements)) return;
		mat2array.set(elements);
		gl.uniformMatrix2fv(this.addr, false, mat2array);
		copyArray(cache, elements);
	}
}
function setValueM3(gl, v) {
	const cache = this.cache;
	const elements = v.elements;
	if (elements === void 0) {
		if (arraysEqual(cache, v)) return;
		gl.uniformMatrix3fv(this.addr, false, v);
		copyArray(cache, v);
	} else {
		if (arraysEqual(cache, elements)) return;
		mat3array.set(elements);
		gl.uniformMatrix3fv(this.addr, false, mat3array);
		copyArray(cache, elements);
	}
}
function setValueM4(gl, v) {
	const cache = this.cache;
	const elements = v.elements;
	if (elements === void 0) {
		if (arraysEqual(cache, v)) return;
		gl.uniformMatrix4fv(this.addr, false, v);
		copyArray(cache, v);
	} else {
		if (arraysEqual(cache, elements)) return;
		mat4array.set(elements);
		gl.uniformMatrix4fv(this.addr, false, mat4array);
		copyArray(cache, elements);
	}
}
function setValueV1i(gl, v) {
	const cache = this.cache;
	if (cache[0] === v) return;
	gl.uniform1i(this.addr, v);
	cache[0] = v;
}
function setValueV2i(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y) {
			gl.uniform2i(this.addr, v.x, v.y);
			cache[0] = v.x;
			cache[1] = v.y;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform2iv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV3i(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
			gl.uniform3i(this.addr, v.x, v.y, v.z);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform3iv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV4i(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
			gl.uniform4i(this.addr, v.x, v.y, v.z, v.w);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
			cache[3] = v.w;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform4iv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV1ui(gl, v) {
	const cache = this.cache;
	if (cache[0] === v) return;
	gl.uniform1ui(this.addr, v);
	cache[0] = v;
}
function setValueV2ui(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y) {
			gl.uniform2ui(this.addr, v.x, v.y);
			cache[0] = v.x;
			cache[1] = v.y;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform2uiv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV3ui(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z) {
			gl.uniform3ui(this.addr, v.x, v.y, v.z);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform3uiv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueV4ui(gl, v) {
	const cache = this.cache;
	if (v.x !== void 0) {
		if (cache[0] !== v.x || cache[1] !== v.y || cache[2] !== v.z || cache[3] !== v.w) {
			gl.uniform4ui(this.addr, v.x, v.y, v.z, v.w);
			cache[0] = v.x;
			cache[1] = v.y;
			cache[2] = v.z;
			cache[3] = v.w;
		}
	} else {
		if (arraysEqual(cache, v)) return;
		gl.uniform4uiv(this.addr, v);
		copyArray(cache, v);
	}
}
function setValueT1(gl, v, textures) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if (cache[0] !== unit) {
		gl.uniform1i(this.addr, unit);
		cache[0] = unit;
	}
	let emptyTexture2D;
	if (this.type === gl.SAMPLER_2D_SHADOW) {
		emptyShadowTexture.compareFunction = textures.isReversedDepthBuffer() ? 518 : 515;
		emptyTexture2D = emptyShadowTexture;
	} else emptyTexture2D = emptyTexture;
	textures.setTexture2D(v || emptyTexture2D, unit);
}
function setValueT3D1(gl, v, textures) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if (cache[0] !== unit) {
		gl.uniform1i(this.addr, unit);
		cache[0] = unit;
	}
	textures.setTexture3D(v || empty3dTexture, unit);
}
function setValueT6(gl, v, textures) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if (cache[0] !== unit) {
		gl.uniform1i(this.addr, unit);
		cache[0] = unit;
	}
	textures.setTextureCube(v || emptyCubeTexture, unit);
}
function setValueT2DArray1(gl, v, textures) {
	const cache = this.cache;
	const unit = textures.allocateTextureUnit();
	if (cache[0] !== unit) {
		gl.uniform1i(this.addr, unit);
		cache[0] = unit;
	}
	textures.setTexture2DArray(v || emptyArrayTexture, unit);
}
function getSingularSetter(type) {
	switch (type) {
		case 5126: return setValueV1f;
		case 35664: return setValueV2f;
		case 35665: return setValueV3f;
		case 35666: return setValueV4f;
		case 35674: return setValueM2;
		case 35675: return setValueM3;
		case 35676: return setValueM4;
		case 5124:
		case 35670: return setValueV1i;
		case 35667:
		case 35671: return setValueV2i;
		case 35668:
		case 35672: return setValueV3i;
		case 35669:
		case 35673: return setValueV4i;
		case 5125: return setValueV1ui;
		case 36294: return setValueV2ui;
		case 36295: return setValueV3ui;
		case 36296: return setValueV4ui;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return setValueT1;
		case 35679:
		case 36299:
		case 36307: return setValueT3D1;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return setValueT6;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return setValueT2DArray1;
	}
}
function setValueV1fArray(gl, v) {
	gl.uniform1fv(this.addr, v);
}
function setValueV2fArray(gl, v) {
	const data = flatten(v, this.size, 2);
	gl.uniform2fv(this.addr, data);
}
function setValueV3fArray(gl, v) {
	const data = flatten(v, this.size, 3);
	gl.uniform3fv(this.addr, data);
}
function setValueV4fArray(gl, v) {
	const data = flatten(v, this.size, 4);
	gl.uniform4fv(this.addr, data);
}
function setValueM2Array(gl, v) {
	const data = flatten(v, this.size, 4);
	gl.uniformMatrix2fv(this.addr, false, data);
}
function setValueM3Array(gl, v) {
	const data = flatten(v, this.size, 9);
	gl.uniformMatrix3fv(this.addr, false, data);
}
function setValueM4Array(gl, v) {
	const data = flatten(v, this.size, 16);
	gl.uniformMatrix4fv(this.addr, false, data);
}
function setValueV1iArray(gl, v) {
	gl.uniform1iv(this.addr, v);
}
function setValueV2iArray(gl, v) {
	gl.uniform2iv(this.addr, v);
}
function setValueV3iArray(gl, v) {
	gl.uniform3iv(this.addr, v);
}
function setValueV4iArray(gl, v) {
	gl.uniform4iv(this.addr, v);
}
function setValueV1uiArray(gl, v) {
	gl.uniform1uiv(this.addr, v);
}
function setValueV2uiArray(gl, v) {
	gl.uniform2uiv(this.addr, v);
}
function setValueV3uiArray(gl, v) {
	gl.uniform3uiv(this.addr, v);
}
function setValueV4uiArray(gl, v) {
	gl.uniform4uiv(this.addr, v);
}
function setValueT1Array(gl, v, textures) {
	const cache = this.cache;
	const n = v.length;
	const units = allocTexUnits(textures, n);
	if (!arraysEqual(cache, units)) {
		gl.uniform1iv(this.addr, units);
		copyArray(cache, units);
	}
	let emptyTexture2D;
	if (this.type === gl.SAMPLER_2D_SHADOW) emptyTexture2D = emptyShadowTexture;
	else emptyTexture2D = emptyTexture;
	for (let i = 0; i !== n; ++i) textures.setTexture2D(v[i] || emptyTexture2D, units[i]);
}
function setValueT3DArray(gl, v, textures) {
	const cache = this.cache;
	const n = v.length;
	const units = allocTexUnits(textures, n);
	if (!arraysEqual(cache, units)) {
		gl.uniform1iv(this.addr, units);
		copyArray(cache, units);
	}
	for (let i = 0; i !== n; ++i) textures.setTexture3D(v[i] || empty3dTexture, units[i]);
}
function setValueT6Array(gl, v, textures) {
	const cache = this.cache;
	const n = v.length;
	const units = allocTexUnits(textures, n);
	if (!arraysEqual(cache, units)) {
		gl.uniform1iv(this.addr, units);
		copyArray(cache, units);
	}
	for (let i = 0; i !== n; ++i) textures.setTextureCube(v[i] || emptyCubeTexture, units[i]);
}
function setValueT2DArrayArray(gl, v, textures) {
	const cache = this.cache;
	const n = v.length;
	const units = allocTexUnits(textures, n);
	if (!arraysEqual(cache, units)) {
		gl.uniform1iv(this.addr, units);
		copyArray(cache, units);
	}
	for (let i = 0; i !== n; ++i) textures.setTexture2DArray(v[i] || emptyArrayTexture, units[i]);
}
function getPureArraySetter(type) {
	switch (type) {
		case 5126: return setValueV1fArray;
		case 35664: return setValueV2fArray;
		case 35665: return setValueV3fArray;
		case 35666: return setValueV4fArray;
		case 35674: return setValueM2Array;
		case 35675: return setValueM3Array;
		case 35676: return setValueM4Array;
		case 5124:
		case 35670: return setValueV1iArray;
		case 35667:
		case 35671: return setValueV2iArray;
		case 35668:
		case 35672: return setValueV3iArray;
		case 35669:
		case 35673: return setValueV4iArray;
		case 5125: return setValueV1uiArray;
		case 36294: return setValueV2uiArray;
		case 36295: return setValueV3uiArray;
		case 36296: return setValueV4uiArray;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return setValueT1Array;
		case 35679:
		case 36299:
		case 36307: return setValueT3DArray;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return setValueT6Array;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return setValueT2DArrayArray;
	}
}
var SingleUniform = class {
	constructor(id, activeInfo, addr) {
		this.id = id;
		this.addr = addr;
		this.cache = [];
		this.type = activeInfo.type;
		this.setValue = getSingularSetter(activeInfo.type);
	}
};
var PureArrayUniform = class {
	constructor(id, activeInfo, addr) {
		this.id = id;
		this.addr = addr;
		this.cache = [];
		this.type = activeInfo.type;
		this.size = activeInfo.size;
		this.setValue = getPureArraySetter(activeInfo.type);
	}
};
var StructuredUniform = class {
	constructor(id) {
		this.id = id;
		this.seq = [];
		this.map = {};
	}
	setValue(gl, value, textures) {
		const seq = this.seq;
		for (let i = 0, n = seq.length; i !== n; ++i) {
			const u = seq[i];
			u.setValue(gl, value[u.id], textures);
		}
	}
};
var RePathPart = /(\w+)(\])?(\[|\.)?/g;
function addUniform(container, uniformObject) {
	container.seq.push(uniformObject);
	container.map[uniformObject.id] = uniformObject;
}
function parseUniform(activeInfo, addr, container) {
	const path = activeInfo.name, pathLength = path.length;
	RePathPart.lastIndex = 0;
	while (true) {
		const match = RePathPart.exec(path), matchEnd = RePathPart.lastIndex;
		let id = match[1];
		const idIsIndex = match[2] === "]", subscript = match[3];
		if (idIsIndex) id = id | 0;
		if (subscript === void 0 || subscript === "[" && matchEnd + 2 === pathLength) {
			addUniform(container, subscript === void 0 ? new SingleUniform(id, activeInfo, addr) : new PureArrayUniform(id, activeInfo, addr));
			break;
		} else {
			let next = container.map[id];
			if (next === void 0) {
				next = new StructuredUniform(id);
				addUniform(container, next);
			}
			container = next;
		}
	}
}
var WebGLUniforms = class {
	constructor(gl, program) {
		this.seq = [];
		this.map = {};
		const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < n; ++i) {
			const info = gl.getActiveUniform(program, i);
			parseUniform(info, gl.getUniformLocation(program, info.name), this);
		}
		const shadowSamplers = [];
		const otherUniforms = [];
		for (const u of this.seq) if (u.type === gl.SAMPLER_2D_SHADOW || u.type === gl.SAMPLER_CUBE_SHADOW || u.type === gl.SAMPLER_2D_ARRAY_SHADOW) shadowSamplers.push(u);
		else otherUniforms.push(u);
		if (shadowSamplers.length > 0) this.seq = shadowSamplers.concat(otherUniforms);
	}
	setValue(gl, name, value, textures) {
		const u = this.map[name];
		if (u !== void 0) u.setValue(gl, value, textures);
	}
	setOptional(gl, object, name) {
		const v = object[name];
		if (v !== void 0) this.setValue(gl, name, v);
	}
	static upload(gl, seq, values, textures) {
		for (let i = 0, n = seq.length; i !== n; ++i) {
			const u = seq[i], v = values[u.id];
			if (v.needsUpdate !== false) u.setValue(gl, v.value, textures);
		}
	}
	static seqWithValue(seq, values) {
		const r = [];
		for (let i = 0, n = seq.length; i !== n; ++i) {
			const u = seq[i];
			if (u.id in values) r.push(u);
		}
		return r;
	}
};
function WebGLShader(gl, type, string) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, string);
	gl.compileShader(shader);
	return shader;
}
var COMPLETION_STATUS_KHR = 37297;
var programIdCount = 0;
function handleSource(string, errorLine) {
	const lines = string.split("\n");
	const lines2 = [];
	const from = Math.max(errorLine - 6, 0);
	const to = Math.min(errorLine + 6, lines.length);
	for (let i = from; i < to; i++) {
		const line = i + 1;
		lines2.push(`${line === errorLine ? ">" : " "} ${line}: ${lines[i]}`);
	}
	return lines2.join("\n");
}
var _m0 = /*@__PURE__*/ new Matrix3();
function getEncodingComponents(colorSpace) {
	ColorManagement._getMatrix(_m0, ColorManagement.workingColorSpace, colorSpace);
	const encodingMatrix = `mat3( ${_m0.elements.map((v) => v.toFixed(4))} )`;
	switch (ColorManagement.getTransfer(colorSpace)) {
		case LinearTransfer: return [encodingMatrix, "LinearTransferOETF"];
		case SRGBTransfer: return [encodingMatrix, "sRGBTransferOETF"];
		default:
			warn("WebGLProgram: Unsupported color space: ", colorSpace);
			return [encodingMatrix, "LinearTransferOETF"];
	}
}
function getShaderErrors(gl, shader, type) {
	const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	const errors = (gl.getShaderInfoLog(shader) || "").trim();
	if (status && errors === "") return "";
	const errorMatches = /ERROR: 0:(\d+)/.exec(errors);
	if (errorMatches) {
		const errorLine = parseInt(errorMatches[1]);
		return type.toUpperCase() + "\n\n" + errors + "\n\n" + handleSource(gl.getShaderSource(shader), errorLine);
	} else return errors;
}
function getTexelEncodingFunction(functionName, colorSpace) {
	const components = getEncodingComponents(colorSpace);
	return [
		`vec4 ${functionName}( vec4 value ) {`,
		`	return ${components[1]}( vec4( value.rgb * ${components[0]}, value.a ) );`,
		"}"
	].join("\n");
}
var toneMappingFunctions = {
	[1]: "Linear",
	[2]: "Reinhard",
	[3]: "Cineon",
	[4]: "ACESFilmic",
	[6]: "AgX",
	[7]: "Neutral",
	[5]: "Custom"
};
function getToneMappingFunction(functionName, toneMapping) {
	const toneMappingName = toneMappingFunctions[toneMapping];
	if (toneMappingName === void 0) {
		warn("WebGLProgram: Unsupported toneMapping:", toneMapping);
		return "vec3 " + functionName + "( vec3 color ) { return LinearToneMapping( color ); }";
	}
	return "vec3 " + functionName + "( vec3 color ) { return " + toneMappingName + "ToneMapping( color ); }";
}
var _v0 = /*@__PURE__*/ new Vector3();
function getLuminanceFunction() {
	ColorManagement.getLuminanceCoefficients(_v0);
	return [
		"float luminance( const in vec3 rgb ) {",
		`	const vec3 weights = vec3( ${_v0.x.toFixed(4)}, ${_v0.y.toFixed(4)}, ${_v0.z.toFixed(4)} );`,
		"	return dot( weights, rgb );",
		"}"
	].join("\n");
}
function generateVertexExtensions(parameters) {
	return [parameters.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "", parameters.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""].filter(filterEmptyLine).join("\n");
}
function generateDefines(defines) {
	const chunks = [];
	for (const name in defines) {
		const value = defines[name];
		if (value === false) continue;
		chunks.push("#define " + name + " " + value);
	}
	return chunks.join("\n");
}
function fetchAttributeLocations(gl, program) {
	const attributes = {};
	const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	for (let i = 0; i < n; i++) {
		const info = gl.getActiveAttrib(program, i);
		const name = info.name;
		let locationSize = 1;
		if (info.type === gl.FLOAT_MAT2) locationSize = 2;
		if (info.type === gl.FLOAT_MAT3) locationSize = 3;
		if (info.type === gl.FLOAT_MAT4) locationSize = 4;
		attributes[name] = {
			type: info.type,
			location: gl.getAttribLocation(program, name),
			locationSize
		};
	}
	return attributes;
}
function filterEmptyLine(string) {
	return string !== "";
}
function replaceLightNums(string, parameters) {
	const numSpotLightCoords = parameters.numSpotLightShadows + parameters.numSpotLightMaps - parameters.numSpotLightShadowsWithMaps;
	return string.replace(/NUM_SUN_LIGHTS/g, parameters.numSunLights).replace(/NUM_DIR_LIGHTS/g, parameters.numDirLights).replace(/NUM_SPOT_LIGHTS/g, parameters.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, parameters.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, numSpotLightCoords).replace(/NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, parameters.numPointLights).replace(/NUM_HEMI_LIGHTS/g, parameters.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g, parameters.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g, parameters.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, parameters.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, parameters.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, parameters.numPointLightShadows);
}
function replaceClippingPlaneNums(string, parameters) {
	return string.replace(/NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, parameters.numClippingPlanes - parameters.numClipIntersection);
}
var includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;
function resolveIncludes(string) {
	return string.replace(includePattern, includeReplacer);
}
var shaderChunkMap = /* @__PURE__ */ new Map();
function includeReplacer(match, include) {
	let string = ShaderChunk[include];
	if (string === void 0) {
		const newInclude = shaderChunkMap.get(include);
		if (newInclude !== void 0) {
			string = ShaderChunk[newInclude];
			warn("WebGLRenderer: Shader chunk \"%s\" has been deprecated. Use \"%s\" instead.", include, newInclude);
		} else throw new Error("THREE.WebGLProgram: Can not resolve #include <" + include + ">");
	}
	return resolveIncludes(string);
}
var unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function unrollLoops(string) {
	return string.replace(unrollLoopPattern, loopReplacer);
}
function loopReplacer(match, start, end, snippet) {
	let string = "";
	for (let i = parseInt(start); i < parseInt(end); i++) string += snippet.replace(/\[\s*i\s*\]/g, "[ " + i + " ]").replace(/UNROLLED_LOOP_INDEX/g, i);
	return string;
}
function generatePrecision(parameters) {
	let precisionstring = `precision ${parameters.precision} float;
	precision ${parameters.precision} int;
	precision ${parameters.precision} sampler2D;
	precision ${parameters.precision} samplerCube;
	precision ${parameters.precision} sampler3D;
	precision ${parameters.precision} sampler2DArray;
	precision ${parameters.precision} sampler2DShadow;
	precision ${parameters.precision} samplerCubeShadow;
	precision ${parameters.precision} sampler2DArrayShadow;
	precision ${parameters.precision} isampler2D;
	precision ${parameters.precision} isampler3D;
	precision ${parameters.precision} isamplerCube;
	precision ${parameters.precision} isampler2DArray;
	precision ${parameters.precision} usampler2D;
	precision ${parameters.precision} usampler3D;
	precision ${parameters.precision} usamplerCube;
	precision ${parameters.precision} usampler2DArray;
	`;
	if (parameters.precision === "highp") precisionstring += "\n#define HIGH_PRECISION";
	else if (parameters.precision === "mediump") precisionstring += "\n#define MEDIUM_PRECISION";
	else if (parameters.precision === "lowp") precisionstring += "\n#define LOW_PRECISION";
	return precisionstring;
}
var shadowMapTypeDefines = {
	[1]: "SHADOWMAP_TYPE_PCF",
	[3]: "SHADOWMAP_TYPE_VSM"
};
function generateShadowMapTypeDefine(parameters) {
	return shadowMapTypeDefines[parameters.shadowMapType] || "SHADOWMAP_TYPE_BASIC";
}
var envMapTypeDefines = {
	[301]: "ENVMAP_TYPE_CUBE",
	[302]: "ENVMAP_TYPE_CUBE",
	[306]: "ENVMAP_TYPE_CUBE_UV"
};
function generateEnvMapTypeDefine(parameters) {
	if (parameters.envMap === false) return "ENVMAP_TYPE_CUBE";
	return envMapTypeDefines[parameters.envMapMode] || "ENVMAP_TYPE_CUBE";
}
var envMapModeDefines = { [302]: "ENVMAP_MODE_REFRACTION" };
function generateEnvMapModeDefine(parameters) {
	if (parameters.envMap === false) return "ENVMAP_MODE_REFLECTION";
	return envMapModeDefines[parameters.envMapMode] || "ENVMAP_MODE_REFLECTION";
}
var envMapBlendingDefines = {
	[0]: "ENVMAP_BLENDING_MULTIPLY",
	[1]: "ENVMAP_BLENDING_MIX",
	[2]: "ENVMAP_BLENDING_ADD"
};
function generateEnvMapBlendingDefine(parameters) {
	if (parameters.envMap === false) return "ENVMAP_BLENDING_NONE";
	return envMapBlendingDefines[parameters.combine] || "ENVMAP_BLENDING_NONE";
}
function generateCubeUVSize(parameters) {
	const imageHeight = parameters.envMapCubeUVHeight;
	if (imageHeight === null) return null;
	const maxMip = Math.log2(imageHeight) - 2;
	const texelHeight = 1 / imageHeight;
	return {
		texelWidth: 1 / (3 * Math.max(Math.pow(2, maxMip), 112)),
		texelHeight,
		maxMip
	};
}
function WebGLProgram(renderer, cacheKey, parameters, bindingStates) {
	const gl = renderer.getContext();
	const defines = parameters.defines;
	let vertexShader = parameters.vertexShader;
	let fragmentShader = parameters.fragmentShader;
	const shadowMapTypeDefine = generateShadowMapTypeDefine(parameters);
	const envMapTypeDefine = generateEnvMapTypeDefine(parameters);
	const envMapModeDefine = generateEnvMapModeDefine(parameters);
	const envMapBlendingDefine = generateEnvMapBlendingDefine(parameters);
	const envMapCubeUVSize = generateCubeUVSize(parameters);
	const customVertexExtensions = generateVertexExtensions(parameters);
	const customDefines = generateDefines(defines);
	const program = gl.createProgram();
	let prefixVertex, prefixFragment;
	let versionString = parameters.glslVersion ? "#version " + parameters.glslVersion + "\n" : "";
	if (parameters.isRawShaderMaterial) {
		prefixVertex = [
			"#define SHADER_TYPE " + parameters.shaderType,
			"#define SHADER_NAME " + parameters.shaderName,
			customDefines
		].filter(filterEmptyLine).join("\n");
		if (prefixVertex.length > 0) prefixVertex += "\n";
		prefixFragment = [
			"#define SHADER_TYPE " + parameters.shaderType,
			"#define SHADER_NAME " + parameters.shaderName,
			customDefines
		].filter(filterEmptyLine).join("\n");
		if (prefixFragment.length > 0) prefixFragment += "\n";
	} else {
		prefixVertex = [
			generatePrecision(parameters),
			"#define SHADER_TYPE " + parameters.shaderType,
			"#define SHADER_NAME " + parameters.shaderName,
			customDefines,
			parameters.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
			parameters.batching ? "#define USE_BATCHING" : "",
			parameters.batchingColor ? "#define USE_BATCHING_COLOR" : "",
			parameters.instancing ? "#define USE_INSTANCING" : "",
			parameters.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
			parameters.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",
			parameters.useFog && parameters.fog ? "#define USE_FOG" : "",
			parameters.useFog && parameters.fogExp2 ? "#define FOG_EXP2" : "",
			parameters.map ? "#define USE_MAP" : "",
			parameters.envMap ? "#define USE_ENVMAP" : "",
			parameters.envMap ? "#define " + envMapModeDefine : "",
			parameters.lightMap ? "#define USE_LIGHTMAP" : "",
			parameters.aoMap ? "#define USE_AOMAP" : "",
			parameters.bumpMap ? "#define USE_BUMPMAP" : "",
			parameters.normalMap ? "#define USE_NORMALMAP" : "",
			parameters.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
			parameters.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
			parameters.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
			parameters.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
			parameters.anisotropy ? "#define USE_ANISOTROPY" : "",
			parameters.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
			parameters.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
			parameters.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
			parameters.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
			parameters.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
			parameters.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
			parameters.specularMap ? "#define USE_SPECULARMAP" : "",
			parameters.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
			parameters.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
			parameters.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
			parameters.metalnessMap ? "#define USE_METALNESSMAP" : "",
			parameters.alphaMap ? "#define USE_ALPHAMAP" : "",
			parameters.alphaHash ? "#define USE_ALPHAHASH" : "",
			parameters.transmission ? "#define USE_TRANSMISSION" : "",
			parameters.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
			parameters.thicknessMap ? "#define USE_THICKNESSMAP" : "",
			parameters.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
			parameters.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
			parameters.mapUv ? "#define MAP_UV " + parameters.mapUv : "",
			parameters.alphaMapUv ? "#define ALPHAMAP_UV " + parameters.alphaMapUv : "",
			parameters.lightMapUv ? "#define LIGHTMAP_UV " + parameters.lightMapUv : "",
			parameters.aoMapUv ? "#define AOMAP_UV " + parameters.aoMapUv : "",
			parameters.emissiveMapUv ? "#define EMISSIVEMAP_UV " + parameters.emissiveMapUv : "",
			parameters.bumpMapUv ? "#define BUMPMAP_UV " + parameters.bumpMapUv : "",
			parameters.normalMapUv ? "#define NORMALMAP_UV " + parameters.normalMapUv : "",
			parameters.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + parameters.displacementMapUv : "",
			parameters.metalnessMapUv ? "#define METALNESSMAP_UV " + parameters.metalnessMapUv : "",
			parameters.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + parameters.roughnessMapUv : "",
			parameters.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + parameters.anisotropyMapUv : "",
			parameters.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + parameters.clearcoatMapUv : "",
			parameters.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + parameters.clearcoatNormalMapUv : "",
			parameters.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + parameters.clearcoatRoughnessMapUv : "",
			parameters.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + parameters.iridescenceMapUv : "",
			parameters.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + parameters.iridescenceThicknessMapUv : "",
			parameters.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + parameters.sheenColorMapUv : "",
			parameters.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + parameters.sheenRoughnessMapUv : "",
			parameters.specularMapUv ? "#define SPECULARMAP_UV " + parameters.specularMapUv : "",
			parameters.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + parameters.specularColorMapUv : "",
			parameters.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + parameters.specularIntensityMapUv : "",
			parameters.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + parameters.transmissionMapUv : "",
			parameters.thicknessMapUv ? "#define THICKNESSMAP_UV " + parameters.thicknessMapUv : "",
			parameters.vertexTangents && parameters.flatShading === false ? "#define USE_TANGENT" : "",
			parameters.vertexNormals ? "#define HAS_NORMAL" : "",
			parameters.vertexColors ? "#define USE_COLOR" : "",
			parameters.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
			parameters.vertexUv1s ? "#define USE_UV1" : "",
			parameters.vertexUv2s ? "#define USE_UV2" : "",
			parameters.vertexUv3s ? "#define USE_UV3" : "",
			parameters.pointsUvs ? "#define USE_POINTS_UV" : "",
			parameters.flatShading ? "#define FLAT_SHADED" : "",
			parameters.skinning ? "#define USE_SKINNING" : "",
			parameters.morphTargets ? "#define USE_MORPHTARGETS" : "",
			parameters.morphNormals && parameters.flatShading === false ? "#define USE_MORPHNORMALS" : "",
			parameters.morphColors ? "#define USE_MORPHCOLORS" : "",
			parameters.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + parameters.morphTextureStride : "",
			parameters.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + parameters.morphTargetsCount : "",
			parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
			parameters.flipSided ? "#define FLIP_SIDED" : "",
			parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
			parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",
			parameters.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",
			parameters.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
			parameters.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
			parameters.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
			"uniform mat4 modelMatrix;",
			"uniform mat4 modelViewMatrix;",
			"uniform mat4 projectionMatrix;",
			"uniform mat4 viewMatrix;",
			"uniform mat3 normalMatrix;",
			"uniform vec3 cameraPosition;",
			"uniform bool isOrthographic;",
			"#ifdef USE_INSTANCING",
			"	attribute mat4 instanceMatrix;",
			"#endif",
			"#ifdef USE_INSTANCING_COLOR",
			"	attribute vec3 instanceColor;",
			"#endif",
			"#ifdef USE_INSTANCING_MORPH",
			"	uniform sampler2D morphTexture;",
			"#endif",
			"attribute vec3 position;",
			"attribute vec3 normal;",
			"attribute vec2 uv;",
			"#ifdef USE_UV1",
			"	attribute vec2 uv1;",
			"#endif",
			"#ifdef USE_UV2",
			"	attribute vec2 uv2;",
			"#endif",
			"#ifdef USE_UV3",
			"	attribute vec2 uv3;",
			"#endif",
			"#ifdef USE_TANGENT",
			"	attribute vec4 tangent;",
			"#endif",
			"#if defined( USE_COLOR_ALPHA )",
			"	attribute vec4 color;",
			"#elif defined( USE_COLOR )",
			"	attribute vec3 color;",
			"#endif",
			"#ifdef USE_SKINNING",
			"	attribute vec4 skinIndex;",
			"	attribute vec4 skinWeight;",
			"#endif",
			"\n"
		].filter(filterEmptyLine).join("\n");
		prefixFragment = [
			generatePrecision(parameters),
			"#define SHADER_TYPE " + parameters.shaderType,
			"#define SHADER_NAME " + parameters.shaderName,
			customDefines,
			parameters.useFog && parameters.fog ? "#define USE_FOG" : "",
			parameters.useFog && parameters.fogExp2 ? "#define FOG_EXP2" : "",
			parameters.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
			parameters.map ? "#define USE_MAP" : "",
			parameters.matcap ? "#define USE_MATCAP" : "",
			parameters.envMap ? "#define USE_ENVMAP" : "",
			parameters.envMap ? "#define " + envMapTypeDefine : "",
			parameters.envMap ? "#define " + envMapModeDefine : "",
			parameters.envMap ? "#define " + envMapBlendingDefine : "",
			envMapCubeUVSize ? "#define CUBEUV_TEXEL_WIDTH " + envMapCubeUVSize.texelWidth : "",
			envMapCubeUVSize ? "#define CUBEUV_TEXEL_HEIGHT " + envMapCubeUVSize.texelHeight : "",
			envMapCubeUVSize ? "#define CUBEUV_MAX_MIP " + envMapCubeUVSize.maxMip + ".0" : "",
			parameters.lightMap ? "#define USE_LIGHTMAP" : "",
			parameters.aoMap ? "#define USE_AOMAP" : "",
			parameters.bumpMap ? "#define USE_BUMPMAP" : "",
			parameters.normalMap ? "#define USE_NORMALMAP" : "",
			parameters.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
			parameters.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
			parameters.packedNormalMap ? "#define USE_PACKED_NORMALMAP" : "",
			parameters.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
			parameters.anisotropy ? "#define USE_ANISOTROPY" : "",
			parameters.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
			parameters.clearcoat ? "#define USE_CLEARCOAT" : "",
			parameters.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
			parameters.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
			parameters.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
			parameters.dispersion ? "#define USE_DISPERSION" : "",
			parameters.retroreflection ? "#define USE_RETROREFLECTION" : "",
			parameters.iridescence ? "#define USE_IRIDESCENCE" : "",
			parameters.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
			parameters.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
			parameters.specularMap ? "#define USE_SPECULARMAP" : "",
			parameters.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
			parameters.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
			parameters.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
			parameters.metalnessMap ? "#define USE_METALNESSMAP" : "",
			parameters.alphaMap ? "#define USE_ALPHAMAP" : "",
			parameters.alphaTest ? "#define USE_ALPHATEST" : "",
			parameters.alphaHash ? "#define USE_ALPHAHASH" : "",
			parameters.sheen ? "#define USE_SHEEN" : "",
			parameters.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
			parameters.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
			parameters.transmission ? "#define USE_TRANSMISSION" : "",
			parameters.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
			parameters.thicknessMap ? "#define USE_THICKNESSMAP" : "",
			parameters.vertexTangents && parameters.flatShading === false ? "#define USE_TANGENT" : "",
			parameters.vertexColors || parameters.instancingColor ? "#define USE_COLOR" : "",
			parameters.vertexAlphas || parameters.batchingColor ? "#define USE_COLOR_ALPHA" : "",
			parameters.vertexUv1s ? "#define USE_UV1" : "",
			parameters.vertexUv2s ? "#define USE_UV2" : "",
			parameters.vertexUv3s ? "#define USE_UV3" : "",
			parameters.pointsUvs ? "#define USE_POINTS_UV" : "",
			parameters.gradientMap ? "#define USE_GRADIENTMAP" : "",
			parameters.flatShading ? "#define FLAT_SHADED" : "",
			parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
			parameters.flipSided ? "#define FLIP_SIDED" : "",
			parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
			parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",
			parameters.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",
			parameters.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
			parameters.numLightProbeGrids > 0 ? "#define USE_LIGHT_PROBES_GRID" : "",
			parameters.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
			parameters.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",
			parameters.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
			parameters.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
			"uniform mat4 viewMatrix;",
			"uniform vec3 cameraPosition;",
			"uniform bool isOrthographic;",
			parameters.toneMapping !== 0 ? "#define TONE_MAPPING" : "",
			parameters.toneMapping !== 0 ? ShaderChunk["tonemapping_pars_fragment"] : "",
			parameters.toneMapping !== 0 ? getToneMappingFunction("toneMapping", parameters.toneMapping) : "",
			parameters.dithering ? "#define DITHERING" : "",
			parameters.opaque ? "#define OPAQUE" : "",
			ShaderChunk["colorspace_pars_fragment"],
			getTexelEncodingFunction("linearToOutputTexel", parameters.outputColorSpace),
			getLuminanceFunction(),
			parameters.useDepthPacking ? "#define DEPTH_PACKING " + parameters.depthPacking : "",
			"\n"
		].filter(filterEmptyLine).join("\n");
	}
	vertexShader = resolveIncludes(vertexShader);
	vertexShader = replaceLightNums(vertexShader, parameters);
	vertexShader = replaceClippingPlaneNums(vertexShader, parameters);
	fragmentShader = resolveIncludes(fragmentShader);
	fragmentShader = replaceLightNums(fragmentShader, parameters);
	fragmentShader = replaceClippingPlaneNums(fragmentShader, parameters);
	vertexShader = unrollLoops(vertexShader);
	fragmentShader = unrollLoops(fragmentShader);
	if (parameters.isRawShaderMaterial !== true) {
		versionString = "#version 300 es\n";
		prefixVertex = [
			customVertexExtensions,
			"#define attribute in",
			"#define varying out",
			"#define texture2D texture"
		].join("\n") + "\n" + prefixVertex;
		prefixFragment = [
			"#define varying in",
			parameters.glslVersion === "300 es" ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
			parameters.glslVersion === "300 es" ? "" : "#define gl_FragColor pc_fragColor",
			"#define gl_FragDepthEXT gl_FragDepth",
			"#define texture2D texture",
			"#define textureCube texture",
			"#define texture2DProj textureProj",
			"#define texture2DLodEXT textureLod",
			"#define texture2DProjLodEXT textureProjLod",
			"#define textureCubeLodEXT textureLod",
			"#define texture2DGradEXT textureGrad",
			"#define texture2DProjGradEXT textureProjGrad",
			"#define textureCubeGradEXT textureGrad"
		].join("\n") + "\n" + prefixFragment;
	}
	const vertexGlsl = versionString + prefixVertex + vertexShader;
	const fragmentGlsl = versionString + prefixFragment + fragmentShader;
	const glVertexShader = WebGLShader(gl, gl.VERTEX_SHADER, vertexGlsl);
	const glFragmentShader = WebGLShader(gl, gl.FRAGMENT_SHADER, fragmentGlsl);
	gl.attachShader(program, glVertexShader);
	gl.attachShader(program, glFragmentShader);
	if (parameters.index0AttributeName !== void 0) gl.bindAttribLocation(program, 0, parameters.index0AttributeName);
	else if (parameters.hasPositionAttribute === true) gl.bindAttribLocation(program, 0, "position");
	gl.linkProgram(program);
	function onFirstUse(self) {
		if (renderer.debug.checkShaderErrors) {
			const programInfoLog = gl.getProgramInfoLog(program) || "";
			const vertexShaderInfoLog = gl.getShaderInfoLog(glVertexShader) || "";
			const fragmentShaderInfoLog = gl.getShaderInfoLog(glFragmentShader) || "";
			const programLog = programInfoLog.trim();
			const vertexLog = vertexShaderInfoLog.trim();
			const fragmentLog = fragmentShaderInfoLog.trim();
			let runnable = true;
			let haveDiagnostics = true;
			if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
				runnable = false;
				if (typeof renderer.debug.onShaderError === "function") renderer.debug.onShaderError(gl, program, glVertexShader, glFragmentShader);
				else {
					const vertexErrors = getShaderErrors(gl, glVertexShader, "vertex");
					const fragmentErrors = getShaderErrors(gl, glFragmentShader, "fragment");
					error("WebGLProgram: Shader Error " + gl.getError() + " - VALIDATE_STATUS " + gl.getProgramParameter(program, gl.VALIDATE_STATUS) + "\n\nMaterial Name: " + self.name + "\nMaterial Type: " + self.type + "\n\nProgram Info Log: " + programLog + "\n" + vertexErrors + "\n" + fragmentErrors);
				}
			} else if (programLog !== "") warn("WebGLProgram: Program Info Log:", programLog);
			else if (vertexLog === "" || fragmentLog === "") haveDiagnostics = false;
			if (haveDiagnostics) self.diagnostics = {
				runnable,
				programLog,
				vertexShader: {
					log: vertexLog,
					prefix: prefixVertex
				},
				fragmentShader: {
					log: fragmentLog,
					prefix: prefixFragment
				}
			};
		}
		gl.deleteShader(glVertexShader);
		gl.deleteShader(glFragmentShader);
		cachedUniforms = new WebGLUniforms(gl, program);
		cachedAttributes = fetchAttributeLocations(gl, program);
	}
	let cachedUniforms;
	this.getUniforms = function() {
		if (cachedUniforms === void 0) onFirstUse(this);
		return cachedUniforms;
	};
	let cachedAttributes;
	this.getAttributes = function() {
		if (cachedAttributes === void 0) onFirstUse(this);
		return cachedAttributes;
	};
	let programReady = parameters.rendererExtensionParallelShaderCompile === false;
	this.isReady = function() {
		if (programReady === false) programReady = gl.getProgramParameter(program, COMPLETION_STATUS_KHR);
		return programReady;
	};
	this.destroy = function() {
		bindingStates.releaseStatesOfProgram(this);
		gl.deleteProgram(program);
		this.program = void 0;
	};
	this.type = parameters.shaderType;
	this.name = parameters.shaderName;
	this.id = programIdCount++;
	this.cacheKey = cacheKey;
	this.usedTimes = 1;
	this.program = program;
	this.vertexShader = glVertexShader;
	this.fragmentShader = glFragmentShader;
	return this;
}
var _id = 0;
var WebGLShaderCache = class {
	constructor() {
		this.shaderCache = /* @__PURE__ */ new Map();
		this.materialCache = /* @__PURE__ */ new Map();
	}
	update(material, vertexShaderStage, fragmentShaderStage) {
		const materialShaders = this._getShaderCacheForMaterial(material);
		if (materialShaders.has(vertexShaderStage) === false) {
			materialShaders.add(vertexShaderStage);
			vertexShaderStage.usedTimes++;
		}
		if (materialShaders.has(fragmentShaderStage) === false) {
			materialShaders.add(fragmentShaderStage);
			fragmentShaderStage.usedTimes++;
		}
		return this;
	}
	remove(material) {
		const materialShaders = this.materialCache.get(material);
		for (const shaderStage of materialShaders) {
			shaderStage.usedTimes--;
			if (shaderStage.usedTimes === 0) this.shaderCache.delete(shaderStage.code);
		}
		this.materialCache.delete(material);
		return this;
	}
	getVertexShaderStage(material) {
		return this._getShaderStage(material.vertexShader);
	}
	getFragmentShaderStage(material) {
		return this._getShaderStage(material.fragmentShader);
	}
	dispose() {
		this.shaderCache.clear();
		this.materialCache.clear();
	}
	_getShaderCacheForMaterial(material) {
		const cache = this.materialCache;
		let set = cache.get(material);
		if (set === void 0) {
			set = /* @__PURE__ */ new Set();
			cache.set(material, set);
		}
		return set;
	}
	_getShaderStage(code) {
		const cache = this.shaderCache;
		let stage = cache.get(code);
		if (stage === void 0) {
			stage = new WebGLShaderStage(code);
			cache.set(code, stage);
		}
		return stage;
	}
};
var WebGLShaderStage = class {
	constructor(code) {
		this.id = _id++;
		this.code = code;
		this.usedTimes = 0;
	}
};
function isPackedRGFormat(format) {
	return format === 1030 || format === 37490 || format === 36285;
}
function WebGLPrograms(renderer, environments, extensions, capabilities, bindingStates, clipping) {
	const _programLayers = new Layers();
	const _customShaders = new WebGLShaderCache();
	const _activeChannels = /* @__PURE__ */ new Set();
	const programs = [];
	const programsMap = /* @__PURE__ */ new Map();
	const logarithmicDepthBuffer = capabilities.logarithmicDepthBuffer;
	let precision = capabilities.precision;
	const shaderIDs = {
		MeshDepthMaterial: "depth",
		MeshDistanceMaterial: "distance",
		MeshNormalMaterial: "normal",
		MeshBasicMaterial: "basic",
		MeshLambertMaterial: "lambert",
		MeshPhongMaterial: "phong",
		MeshToonMaterial: "toon",
		MeshStandardMaterial: "physical",
		MeshPhysicalMaterial: "physical",
		MeshMatcapMaterial: "matcap",
		LineBasicMaterial: "basic",
		LineDashedMaterial: "dashed",
		PointsMaterial: "points",
		ShadowMaterial: "shadow",
		SpriteMaterial: "sprite"
	};
	function getChannel(value) {
		_activeChannels.add(value);
		if (value === 0) return "uv";
		return `uv${value}`;
	}
	function getParameters(material, lights, shadows, scene, object, lightProbeGrids) {
		const fog = scene.fog;
		const geometry = object.geometry;
		const environment = material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial ? scene.environment : null;
		const usePMREM = material.isMeshStandardMaterial || material.isMeshLambertMaterial && !material.envMap || material.isMeshPhongMaterial && !material.envMap;
		const envMap = environments.get(material.envMap || environment, usePMREM);
		const envMapCubeUVHeight = !!envMap && envMap.mapping === 306 ? envMap.image.height : null;
		const shaderID = shaderIDs[material.type];
		if (material.precision !== null) {
			precision = capabilities.getMaxPrecision(material.precision);
			if (precision !== material.precision) warn("WebGLProgram.getParameters:", material.precision, "not supported, using", precision, "instead.");
		}
		const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
		const morphTargetsCount = morphAttribute !== void 0 ? morphAttribute.length : 0;
		let morphTextureStride = 0;
		if (geometry.morphAttributes.position !== void 0) morphTextureStride = 1;
		if (geometry.morphAttributes.normal !== void 0) morphTextureStride = 2;
		if (geometry.morphAttributes.color !== void 0) morphTextureStride = 3;
		let vertexShader, fragmentShader;
		let customVertexShaderID, customFragmentShaderID;
		if (shaderID) {
			const shader = ShaderLib[shaderID];
			vertexShader = shader.vertexShader;
			fragmentShader = shader.fragmentShader;
		} else {
			vertexShader = material.vertexShader;
			fragmentShader = material.fragmentShader;
			const vertexShaderStage = _customShaders.getVertexShaderStage(material);
			const fragmentShaderStage = _customShaders.getFragmentShaderStage(material);
			_customShaders.update(material, vertexShaderStage, fragmentShaderStage);
			customVertexShaderID = vertexShaderStage.id;
			customFragmentShaderID = fragmentShaderStage.id;
		}
		const currentRenderTarget = renderer.getRenderTarget();
		const reversedDepthBuffer = renderer.state.buffers.depth.getReversed();
		const IS_INSTANCEDMESH = object.isInstancedMesh === true;
		const IS_BATCHEDMESH = object.isBatchedMesh === true;
		const HAS_MAP = !!material.map;
		const HAS_MATCAP = !!material.matcap;
		const HAS_ENVMAP = !!envMap;
		const HAS_AOMAP = !!material.aoMap;
		const HAS_LIGHTMAP = !!material.lightMap;
		const HAS_BUMPMAP = !!material.bumpMap && material.wireframe === false;
		const HAS_NORMALMAP = !!material.normalMap;
		const HAS_DISPLACEMENTMAP = !!material.displacementMap;
		const HAS_EMISSIVEMAP = !!material.emissiveMap;
		const HAS_METALNESSMAP = !!material.metalnessMap;
		const HAS_ROUGHNESSMAP = !!material.roughnessMap;
		const HAS_ANISOTROPY = material.anisotropy > 0;
		const HAS_CLEARCOAT = material.clearcoat > 0;
		const HAS_DISPERSION = material.dispersion > 0;
		const HAS_RETROREFLECTION = material.retroreflectivity > 0;
		const HAS_IRIDESCENCE = material.iridescence > 0;
		const HAS_SHEEN = material.sheen > 0;
		const HAS_TRANSMISSION = material.transmission > 0;
		const HAS_ANISOTROPYMAP = HAS_ANISOTROPY && !!material.anisotropyMap;
		const HAS_CLEARCOATMAP = HAS_CLEARCOAT && !!material.clearcoatMap;
		const HAS_CLEARCOAT_NORMALMAP = HAS_CLEARCOAT && !!material.clearcoatNormalMap;
		const HAS_CLEARCOAT_ROUGHNESSMAP = HAS_CLEARCOAT && !!material.clearcoatRoughnessMap;
		const HAS_IRIDESCENCEMAP = HAS_IRIDESCENCE && !!material.iridescenceMap;
		const HAS_IRIDESCENCE_THICKNESSMAP = HAS_IRIDESCENCE && !!material.iridescenceThicknessMap;
		const HAS_SHEEN_COLORMAP = HAS_SHEEN && !!material.sheenColorMap;
		const HAS_SHEEN_ROUGHNESSMAP = HAS_SHEEN && !!material.sheenRoughnessMap;
		const HAS_SPECULARMAP = !!material.specularMap;
		const HAS_SPECULAR_COLORMAP = !!material.specularColorMap;
		const HAS_SPECULAR_INTENSITYMAP = !!material.specularIntensityMap;
		const HAS_TRANSMISSIONMAP = HAS_TRANSMISSION && !!material.transmissionMap;
		const HAS_THICKNESSMAP = HAS_TRANSMISSION && !!material.thicknessMap;
		const HAS_GRADIENTMAP = !!material.gradientMap;
		const HAS_ALPHAMAP = !!material.alphaMap;
		const HAS_ALPHATEST = material.alphaTest > 0;
		const HAS_ALPHAHASH = !!material.alphaHash;
		const HAS_EXTENSIONS = !!material.extensions;
		let toneMapping = 0;
		if (material.toneMapped) {
			if (currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true) toneMapping = renderer.toneMapping;
		}
		const parameters = {
			shaderID,
			shaderType: material.type,
			shaderName: material.name,
			vertexShader,
			fragmentShader,
			defines: material.defines,
			customVertexShaderID,
			customFragmentShaderID,
			isRawShaderMaterial: material.isRawShaderMaterial === true,
			glslVersion: material.glslVersion,
			precision,
			batching: IS_BATCHEDMESH,
			batchingColor: IS_BATCHEDMESH && object._colorsTexture !== null,
			instancing: IS_INSTANCEDMESH,
			instancingColor: IS_INSTANCEDMESH && object.instanceColor !== null,
			instancingMorph: IS_INSTANCEDMESH && object.morphTexture !== null,
			outputColorSpace: currentRenderTarget === null ? renderer.outputColorSpace : currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : ColorManagement.workingColorSpace,
			alphaToCoverage: !!material.alphaToCoverage,
			map: HAS_MAP,
			matcap: HAS_MATCAP,
			envMap: HAS_ENVMAP,
			envMapMode: HAS_ENVMAP && envMap.mapping,
			envMapCubeUVHeight,
			aoMap: HAS_AOMAP,
			lightMap: HAS_LIGHTMAP,
			bumpMap: HAS_BUMPMAP,
			normalMap: HAS_NORMALMAP,
			displacementMap: HAS_DISPLACEMENTMAP,
			emissiveMap: HAS_EMISSIVEMAP,
			normalMapObjectSpace: HAS_NORMALMAP && material.normalMapType === 1,
			normalMapTangentSpace: HAS_NORMALMAP && material.normalMapType === 0,
			packedNormalMap: HAS_NORMALMAP && material.normalMapType === 0 && isPackedRGFormat(material.normalMap.format),
			metalnessMap: HAS_METALNESSMAP,
			roughnessMap: HAS_ROUGHNESSMAP,
			anisotropy: HAS_ANISOTROPY,
			anisotropyMap: HAS_ANISOTROPYMAP,
			clearcoat: HAS_CLEARCOAT,
			clearcoatMap: HAS_CLEARCOATMAP,
			clearcoatNormalMap: HAS_CLEARCOAT_NORMALMAP,
			clearcoatRoughnessMap: HAS_CLEARCOAT_ROUGHNESSMAP,
			dispersion: HAS_DISPERSION,
			retroreflection: HAS_RETROREFLECTION,
			iridescence: HAS_IRIDESCENCE,
			iridescenceMap: HAS_IRIDESCENCEMAP,
			iridescenceThicknessMap: HAS_IRIDESCENCE_THICKNESSMAP,
			sheen: HAS_SHEEN,
			sheenColorMap: HAS_SHEEN_COLORMAP,
			sheenRoughnessMap: HAS_SHEEN_ROUGHNESSMAP,
			specularMap: HAS_SPECULARMAP,
			specularColorMap: HAS_SPECULAR_COLORMAP,
			specularIntensityMap: HAS_SPECULAR_INTENSITYMAP,
			transmission: HAS_TRANSMISSION,
			transmissionMap: HAS_TRANSMISSIONMAP,
			thicknessMap: HAS_THICKNESSMAP,
			gradientMap: HAS_GRADIENTMAP,
			opaque: material.transparent === false && material.blending === 1 && material.alphaToCoverage === false,
			alphaMap: HAS_ALPHAMAP,
			alphaTest: HAS_ALPHATEST,
			alphaHash: HAS_ALPHAHASH,
			combine: material.combine,
			mapUv: HAS_MAP && getChannel(material.map.channel),
			aoMapUv: HAS_AOMAP && getChannel(material.aoMap.channel),
			lightMapUv: HAS_LIGHTMAP && getChannel(material.lightMap.channel),
			bumpMapUv: HAS_BUMPMAP && getChannel(material.bumpMap.channel),
			normalMapUv: HAS_NORMALMAP && getChannel(material.normalMap.channel),
			displacementMapUv: HAS_DISPLACEMENTMAP && getChannel(material.displacementMap.channel),
			emissiveMapUv: HAS_EMISSIVEMAP && getChannel(material.emissiveMap.channel),
			metalnessMapUv: HAS_METALNESSMAP && getChannel(material.metalnessMap.channel),
			roughnessMapUv: HAS_ROUGHNESSMAP && getChannel(material.roughnessMap.channel),
			anisotropyMapUv: HAS_ANISOTROPYMAP && getChannel(material.anisotropyMap.channel),
			clearcoatMapUv: HAS_CLEARCOATMAP && getChannel(material.clearcoatMap.channel),
			clearcoatNormalMapUv: HAS_CLEARCOAT_NORMALMAP && getChannel(material.clearcoatNormalMap.channel),
			clearcoatRoughnessMapUv: HAS_CLEARCOAT_ROUGHNESSMAP && getChannel(material.clearcoatRoughnessMap.channel),
			iridescenceMapUv: HAS_IRIDESCENCEMAP && getChannel(material.iridescenceMap.channel),
			iridescenceThicknessMapUv: HAS_IRIDESCENCE_THICKNESSMAP && getChannel(material.iridescenceThicknessMap.channel),
			sheenColorMapUv: HAS_SHEEN_COLORMAP && getChannel(material.sheenColorMap.channel),
			sheenRoughnessMapUv: HAS_SHEEN_ROUGHNESSMAP && getChannel(material.sheenRoughnessMap.channel),
			specularMapUv: HAS_SPECULARMAP && getChannel(material.specularMap.channel),
			specularColorMapUv: HAS_SPECULAR_COLORMAP && getChannel(material.specularColorMap.channel),
			specularIntensityMapUv: HAS_SPECULAR_INTENSITYMAP && getChannel(material.specularIntensityMap.channel),
			transmissionMapUv: HAS_TRANSMISSIONMAP && getChannel(material.transmissionMap.channel),
			thicknessMapUv: HAS_THICKNESSMAP && getChannel(material.thicknessMap.channel),
			alphaMapUv: HAS_ALPHAMAP && getChannel(material.alphaMap.channel),
			vertexTangents: !!geometry.attributes.tangent && (HAS_NORMALMAP || HAS_ANISOTROPY),
			vertexNormals: !!geometry.attributes.normal,
			vertexColors: material.vertexColors,
			vertexAlphas: material.vertexColors === true && !!geometry.attributes.color && geometry.attributes.color.itemSize === 4,
			pointsUvs: object.isPoints === true && !!geometry.attributes.uv && (HAS_MAP || HAS_ALPHAMAP),
			fog: !!fog,
			useFog: material.fog === true,
			fogExp2: !!fog && fog.isFogExp2,
			flatShading: material.wireframe === false && (material.flatShading === true || geometry.attributes.normal === void 0 && HAS_NORMALMAP === false && (material.isMeshLambertMaterial || material.isMeshPhongMaterial || material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)),
			sizeAttenuation: material.sizeAttenuation === true,
			logarithmicDepthBuffer,
			reversedDepthBuffer,
			skinning: object.isSkinnedMesh === true,
			hasPositionAttribute: geometry.attributes.position !== void 0,
			morphTargets: geometry.morphAttributes.position !== void 0,
			morphNormals: geometry.morphAttributes.normal !== void 0,
			morphColors: geometry.morphAttributes.color !== void 0,
			morphTargetsCount,
			morphTextureStride,
			numSunLights: lights.sun.length,
			numDirLights: lights.directional.length,
			numPointLights: lights.point.length,
			numSpotLights: lights.spot.length,
			numSpotLightMaps: lights.spotLightMap.length,
			numRectAreaLights: lights.rectArea.length,
			numHemiLights: lights.hemi.length,
			numSunLightShadows: lights.sunShadowMap.length,
			numDirLightShadows: lights.directionalShadowMap.length,
			numPointLightShadows: lights.pointShadowMap.length,
			numSpotLightShadows: lights.spotShadowMap.length,
			numSpotLightShadowsWithMaps: lights.numSpotLightShadowsWithMaps,
			numLightProbes: lights.numLightProbes,
			numLightProbeGrids: lightProbeGrids.length,
			numClippingPlanes: clipping.numPlanes,
			numClipIntersection: clipping.numIntersection,
			dithering: material.dithering,
			shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0,
			shadowMapType: renderer.shadowMap.type,
			toneMapping,
			decodeVideoTexture: HAS_MAP && material.map.isVideoTexture === true && ColorManagement.getTransfer(material.map.colorSpace) === "srgb",
			decodeVideoTextureEmissive: HAS_EMISSIVEMAP && material.emissiveMap.isVideoTexture === true && ColorManagement.getTransfer(material.emissiveMap.colorSpace) === "srgb",
			premultipliedAlpha: material.premultipliedAlpha,
			doubleSided: material.side === 2,
			flipSided: material.side === 1,
			useDepthPacking: material.depthPacking >= 0,
			depthPacking: material.depthPacking || 0,
			index0AttributeName: material.index0AttributeName,
			extensionClipCullDistance: HAS_EXTENSIONS && material.extensions.clipCullDistance === true && extensions.has("WEBGL_clip_cull_distance"),
			extensionMultiDraw: (HAS_EXTENSIONS && material.extensions.multiDraw === true || IS_BATCHEDMESH) && extensions.has("WEBGL_multi_draw"),
			rendererExtensionParallelShaderCompile: extensions.has("KHR_parallel_shader_compile"),
			customProgramCacheKey: material.customProgramCacheKey()
		};
		parameters.vertexUv1s = _activeChannels.has(1);
		parameters.vertexUv2s = _activeChannels.has(2);
		parameters.vertexUv3s = _activeChannels.has(3);
		_activeChannels.clear();
		return parameters;
	}
	function getProgramCacheKey(parameters) {
		const array = [];
		if (parameters.shaderID) array.push(parameters.shaderID);
		else {
			array.push(parameters.customVertexShaderID);
			array.push(parameters.customFragmentShaderID);
		}
		if (parameters.defines !== void 0) for (const name in parameters.defines) {
			array.push(name);
			array.push(parameters.defines[name]);
		}
		if (parameters.isRawShaderMaterial === false) {
			getProgramCacheKeyParameters(array, parameters);
			getProgramCacheKeyBooleans(array, parameters);
			array.push(renderer.outputColorSpace);
		}
		array.push(parameters.customProgramCacheKey);
		return array.join();
	}
	function getProgramCacheKeyParameters(array, parameters) {
		array.push(parameters.precision);
		array.push(parameters.outputColorSpace);
		array.push(parameters.envMapMode);
		array.push(parameters.envMapCubeUVHeight);
		array.push(parameters.mapUv);
		array.push(parameters.alphaMapUv);
		array.push(parameters.lightMapUv);
		array.push(parameters.aoMapUv);
		array.push(parameters.bumpMapUv);
		array.push(parameters.normalMapUv);
		array.push(parameters.displacementMapUv);
		array.push(parameters.emissiveMapUv);
		array.push(parameters.metalnessMapUv);
		array.push(parameters.roughnessMapUv);
		array.push(parameters.anisotropyMapUv);
		array.push(parameters.clearcoatMapUv);
		array.push(parameters.clearcoatNormalMapUv);
		array.push(parameters.clearcoatRoughnessMapUv);
		array.push(parameters.iridescenceMapUv);
		array.push(parameters.iridescenceThicknessMapUv);
		array.push(parameters.sheenColorMapUv);
		array.push(parameters.sheenRoughnessMapUv);
		array.push(parameters.specularMapUv);
		array.push(parameters.specularColorMapUv);
		array.push(parameters.specularIntensityMapUv);
		array.push(parameters.transmissionMapUv);
		array.push(parameters.thicknessMapUv);
		array.push(parameters.combine);
		array.push(parameters.fogExp2);
		array.push(parameters.sizeAttenuation);
		array.push(parameters.morphTargetsCount);
		array.push(parameters.morphAttributeCount);
		array.push(parameters.numSunLights);
		array.push(parameters.numDirLights);
		array.push(parameters.numPointLights);
		array.push(parameters.numSpotLights);
		array.push(parameters.numSpotLightMaps);
		array.push(parameters.numHemiLights);
		array.push(parameters.numRectAreaLights);
		array.push(parameters.numSunLightShadows);
		array.push(parameters.numDirLightShadows);
		array.push(parameters.numPointLightShadows);
		array.push(parameters.numSpotLightShadows);
		array.push(parameters.numSpotLightShadowsWithMaps);
		array.push(parameters.numLightProbes);
		array.push(parameters.shadowMapType);
		array.push(parameters.toneMapping);
		array.push(parameters.numClippingPlanes);
		array.push(parameters.numClipIntersection);
		array.push(parameters.depthPacking);
	}
	function getProgramCacheKeyBooleans(array, parameters) {
		_programLayers.disableAll();
		if (parameters.instancing) _programLayers.enable(0);
		if (parameters.instancingColor) _programLayers.enable(1);
		if (parameters.instancingMorph) _programLayers.enable(2);
		if (parameters.matcap) _programLayers.enable(3);
		if (parameters.envMap) _programLayers.enable(4);
		if (parameters.normalMapObjectSpace) _programLayers.enable(5);
		if (parameters.normalMapTangentSpace) _programLayers.enable(6);
		if (parameters.clearcoat) _programLayers.enable(7);
		if (parameters.iridescence) _programLayers.enable(8);
		if (parameters.alphaTest) _programLayers.enable(9);
		if (parameters.vertexColors) _programLayers.enable(10);
		if (parameters.vertexAlphas) _programLayers.enable(11);
		if (parameters.vertexUv1s) _programLayers.enable(12);
		if (parameters.vertexUv2s) _programLayers.enable(13);
		if (parameters.vertexUv3s) _programLayers.enable(14);
		if (parameters.vertexTangents) _programLayers.enable(15);
		if (parameters.anisotropy) _programLayers.enable(16);
		if (parameters.alphaHash) _programLayers.enable(17);
		if (parameters.batching) _programLayers.enable(18);
		if (parameters.dispersion) _programLayers.enable(19);
		if (parameters.retroreflection) _programLayers.enable(24);
		if (parameters.batchingColor) _programLayers.enable(20);
		if (parameters.gradientMap) _programLayers.enable(21);
		if (parameters.packedNormalMap) _programLayers.enable(22);
		if (parameters.vertexNormals) _programLayers.enable(23);
		array.push(_programLayers.mask);
		_programLayers.disableAll();
		if (parameters.fog) _programLayers.enable(0);
		if (parameters.useFog) _programLayers.enable(1);
		if (parameters.flatShading) _programLayers.enable(2);
		if (parameters.logarithmicDepthBuffer) _programLayers.enable(3);
		if (parameters.reversedDepthBuffer) _programLayers.enable(4);
		if (parameters.skinning) _programLayers.enable(5);
		if (parameters.morphTargets) _programLayers.enable(6);
		if (parameters.morphNormals) _programLayers.enable(7);
		if (parameters.morphColors) _programLayers.enable(8);
		if (parameters.premultipliedAlpha) _programLayers.enable(9);
		if (parameters.shadowMapEnabled) _programLayers.enable(10);
		if (parameters.doubleSided) _programLayers.enable(11);
		if (parameters.flipSided) _programLayers.enable(12);
		if (parameters.useDepthPacking) _programLayers.enable(13);
		if (parameters.dithering) _programLayers.enable(14);
		if (parameters.transmission) _programLayers.enable(15);
		if (parameters.sheen) _programLayers.enable(16);
		if (parameters.opaque) _programLayers.enable(17);
		if (parameters.pointsUvs) _programLayers.enable(18);
		if (parameters.decodeVideoTexture) _programLayers.enable(19);
		if (parameters.decodeVideoTextureEmissive) _programLayers.enable(20);
		if (parameters.alphaToCoverage) _programLayers.enable(21);
		if (parameters.numLightProbeGrids > 0) _programLayers.enable(22);
		if (parameters.hasPositionAttribute) _programLayers.enable(23);
		array.push(_programLayers.mask);
	}
	function getUniforms(material) {
		const shaderID = shaderIDs[material.type];
		let uniforms;
		if (shaderID) {
			const shader = ShaderLib[shaderID];
			uniforms = UniformsUtils.clone(shader.uniforms);
		} else uniforms = material.uniforms;
		return uniforms;
	}
	function acquireProgram(parameters, cacheKey) {
		let program = programsMap.get(cacheKey);
		if (program !== void 0) ++program.usedTimes;
		else {
			program = new WebGLProgram(renderer, cacheKey, parameters, bindingStates);
			programs.push(program);
			programsMap.set(cacheKey, program);
		}
		return program;
	}
	function releaseProgram(program) {
		if (--program.usedTimes === 0) {
			const i = programs.indexOf(program);
			programs[i] = programs[programs.length - 1];
			programs.pop();
			programsMap.delete(program.cacheKey);
			program.destroy();
		}
	}
	function releaseShaderCache(material) {
		_customShaders.remove(material);
	}
	function dispose() {
		_customShaders.dispose();
	}
	return {
		getParameters,
		getProgramCacheKey,
		getUniforms,
		acquireProgram,
		releaseProgram,
		releaseShaderCache,
		programs,
		dispose
	};
}
function WebGLProperties() {
	let properties = /* @__PURE__ */ new WeakMap();
	function has(object) {
		return properties.has(object);
	}
	function get(object) {
		let map = properties.get(object);
		if (map === void 0) {
			map = {};
			properties.set(object, map);
		}
		return map;
	}
	function remove(object) {
		properties.delete(object);
	}
	function update(object, key, value) {
		properties.get(object)[key] = value;
	}
	function dispose() {
		properties = /* @__PURE__ */ new WeakMap();
	}
	return {
		has,
		get,
		remove,
		update,
		dispose
	};
}
function painterSortStable(a, b) {
	if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
	else if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
	else if (a.material.id !== b.material.id) return a.material.id - b.material.id;
	else if (a.materialVariant !== b.materialVariant) return a.materialVariant - b.materialVariant;
	else if (a.z !== b.z) return a.z - b.z;
	else return a.id - b.id;
}
function reversePainterSortStable(a, b) {
	if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
	else if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
	else if (a.z !== b.z) return b.z - a.z;
	else return a.id - b.id;
}
function WebGLRenderList() {
	const renderItems = [];
	let renderItemsIndex = 0;
	const opaque = [];
	const transmissive = [];
	const transparent = [];
	function init() {
		renderItemsIndex = 0;
		opaque.length = 0;
		transmissive.length = 0;
		transparent.length = 0;
	}
	function materialVariant(object) {
		let variant = 0;
		if (object.isInstancedMesh) variant += 2;
		if (object.isSkinnedMesh) variant += 1;
		return variant;
	}
	function getNextRenderItem(object, geometry, material, groupOrder, z, group) {
		let renderItem = renderItems[renderItemsIndex];
		if (renderItem === void 0) {
			renderItem = {
				id: object.id,
				object,
				geometry,
				material,
				materialVariant: materialVariant(object),
				groupOrder,
				renderOrder: object.renderOrder,
				z,
				group
			};
			renderItems[renderItemsIndex] = renderItem;
		} else {
			renderItem.id = object.id;
			renderItem.object = object;
			renderItem.geometry = geometry;
			renderItem.material = material;
			renderItem.materialVariant = materialVariant(object);
			renderItem.groupOrder = groupOrder;
			renderItem.renderOrder = object.renderOrder;
			renderItem.z = z;
			renderItem.group = group;
		}
		renderItemsIndex++;
		return renderItem;
	}
	function push(object, geometry, material, groupOrder, z, group, camera) {
		if (camera.reversedDepth === true) z = -z;
		const renderItem = getNextRenderItem(object, geometry, material, groupOrder, z, group);
		if (material.transmission > 0) transmissive.push(renderItem);
		else if (material.transparent === true) transparent.push(renderItem);
		else opaque.push(renderItem);
	}
	function unshift(object, geometry, material, groupOrder, z, group) {
		const renderItem = getNextRenderItem(object, geometry, material, groupOrder, z, group);
		if (material.transmission > 0) transmissive.unshift(renderItem);
		else if (material.transparent === true) transparent.unshift(renderItem);
		else opaque.unshift(renderItem);
	}
	function sort(customOpaqueSort, customTransparentSort) {
		if (opaque.length > 1) opaque.sort(customOpaqueSort || painterSortStable);
		if (transmissive.length > 1) transmissive.sort(customTransparentSort || reversePainterSortStable);
		if (transparent.length > 1) transparent.sort(customTransparentSort || reversePainterSortStable);
	}
	function finish() {
		for (let i = renderItemsIndex, il = renderItems.length; i < il; i++) {
			const renderItem = renderItems[i];
			if (renderItem.id === null) break;
			renderItem.id = null;
			renderItem.object = null;
			renderItem.geometry = null;
			renderItem.material = null;
			renderItem.group = null;
		}
	}
	return {
		opaque,
		transmissive,
		transparent,
		init,
		push,
		unshift,
		finish,
		sort
	};
}
function WebGLRenderLists() {
	let lists = /* @__PURE__ */ new WeakMap();
	function get(scene, renderCallDepth) {
		const listArray = lists.get(scene);
		let list;
		if (listArray === void 0) {
			list = new WebGLRenderList();
			lists.set(scene, [list]);
		} else if (renderCallDepth >= listArray.length) {
			list = new WebGLRenderList();
			listArray.push(list);
		} else list = listArray[renderCallDepth];
		return list;
	}
	function dispose() {
		lists = /* @__PURE__ */ new WeakMap();
	}
	return {
		get,
		dispose
	};
}
function UniformsCache() {
	const lights = {};
	return { get: function(light) {
		if (lights[light.id] !== void 0) return lights[light.id];
		let uniforms;
		switch (light.type) {
			case "SunLight":
			case "DirectionalLight":
				uniforms = {
					direction: new Vector3(),
					color: new Color()
				};
				break;
			case "SpotLight":
				uniforms = {
					position: new Vector3(),
					direction: new Vector3(),
					color: new Color(),
					distance: 0,
					coneCos: 0,
					penumbraCos: 0,
					decay: 0
				};
				break;
			case "PointLight":
				uniforms = {
					position: new Vector3(),
					color: new Color(),
					distance: 0,
					decay: 0
				};
				break;
			case "HemisphereLight":
				uniforms = {
					direction: new Vector3(),
					skyColor: new Color(),
					groundColor: new Color()
				};
				break;
			case "RectAreaLight": uniforms = {
				color: new Color(),
				position: new Vector3(),
				halfWidth: new Vector3(),
				halfHeight: new Vector3()
			};
		}
		lights[light.id] = uniforms;
		return uniforms;
	} };
}
function ShadowUniformsCache() {
	const lights = {};
	return { get: function(light) {
		if (lights[light.id] !== void 0) return lights[light.id];
		let uniforms;
		switch (light.type) {
			case "SunLight":
			case "DirectionalLight":
				uniforms = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new Vector2()
				};
				break;
			case "SpotLight":
				uniforms = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new Vector2()
				};
				break;
			case "PointLight": uniforms = {
				shadowIntensity: 1,
				shadowBias: 0,
				shadowNormalBias: 0,
				shadowRadius: 1,
				shadowMapSize: new Vector2(),
				shadowCameraNear: 1,
				shadowCameraFar: 1e3
			};
		}
		lights[light.id] = uniforms;
		return uniforms;
	} };
}
var nextVersion = 0;
function shadowCastingAndTexturingLightsFirst(lightA, lightB) {
	return (lightB.castShadow ? 2 : 0) - (lightA.castShadow ? 2 : 0) + (lightB.map ? 1 : 0) - (lightA.map ? 1 : 0);
}
function WebGLLights(extensions) {
	const cache = new UniformsCache();
	const shadowCache = ShadowUniformsCache();
	const state = {
		version: 0,
		hash: {
			sunLength: -1,
			directionalLength: -1,
			pointLength: -1,
			spotLength: -1,
			rectAreaLength: -1,
			hemiLength: -1,
			numSunShadows: -1,
			numDirectionalShadows: -1,
			numPointShadows: -1,
			numSpotShadows: -1,
			numSpotMaps: -1,
			numLightProbes: -1
		},
		ambient: [
			0,
			0,
			0
		],
		probe: [],
		sun: [],
		sunShadow: [],
		sunShadowMap: [],
		sunShadowMatrix: [],
		sunShadowCascade: [],
		directional: [],
		directionalShadow: [],
		directionalShadowMap: [],
		directionalShadowMatrix: [],
		spot: [],
		spotLightMap: [],
		spotShadow: [],
		spotShadowMap: [],
		spotLightMatrix: [],
		rectArea: [],
		rectAreaLTC1: null,
		rectAreaLTC2: null,
		point: [],
		pointShadow: [],
		pointShadowMap: [],
		pointShadowMatrix: [],
		hemi: [],
		numSpotLightShadowsWithMaps: 0,
		numLightProbes: 0
	};
	for (let i = 0; i < 9; i++) state.probe.push(new Vector3());
	const vector3 = new Vector3();
	const matrix4 = new Matrix4();
	const matrix42 = new Matrix4();
	function setup(lights) {
		let r = 0, g = 0, b = 0;
		for (let i = 0; i < 9; i++) state.probe[i].set(0, 0, 0);
		let sunLength = 0;
		let numSunShadows = 0;
		let numSunShadowCascades = 0;
		let directionalLength = 0;
		let pointLength = 0;
		let spotLength = 0;
		let rectAreaLength = 0;
		let hemiLength = 0;
		let numDirectionalShadows = 0;
		let numPointShadows = 0;
		let numSpotShadows = 0;
		let numSpotMaps = 0;
		let numSpotShadowsWithMaps = 0;
		let numLightProbes = 0;
		lights.sort(shadowCastingAndTexturingLightsFirst);
		for (let i = 0, l = lights.length; i < l; i++) {
			const light = lights[i];
			const color = light.color;
			const intensity = light.intensity;
			const distance = light.distance;
			let shadowMap = null;
			if (light.shadow && light.shadow.map) {
				if (light.shadow.map.texture.format === 1030) shadowMap = light.shadow.map.texture;
				else shadowMap = light.shadow.map.depthTexture || light.shadow.map.texture;
			}
			if (light.isAmbientLight) {
				r += color.r * intensity;
				g += color.g * intensity;
				b += color.b * intensity;
			} else if (light.isLightProbe) {
				for (let j = 0; j < 9; j++) state.probe[j].addScaledVector(light.sh.coefficients[j], intensity);
				numLightProbes++;
			} else if (light.isSunLight) {
				const uniforms = cache.get(light);
				uniforms.color.copy(light.color).multiplyScalar(light.intensity);
				if (light.castShadow) {
					const shadow = light.shadow;
					const shadowUniforms = shadowCache.get(light);
					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize.copy(shadow.mapSize).multiply(shadow.getFrameExtents());
					state.sunShadow[numSunShadows] = shadowUniforms;
					state.sunShadowMap[numSunShadows] = shadowMap;
					const cascadeCount = shadow.getViewportCount();
					for (let j = 0; j < cascadeCount; j++) {
						state.sunShadowMatrix[numSunShadowCascades + j] = shadow.getMatrix(j);
						state.sunShadowCascade[numSunShadowCascades + j] = shadow._cascadeData[j];
					}
					numSunShadowCascades += cascadeCount;
					numSunShadows++;
				}
				state.sun[sunLength] = uniforms;
				sunLength++;
			} else if (light.isDirectionalLight) {
				const uniforms = cache.get(light);
				uniforms.color.copy(light.color).multiplyScalar(light.intensity);
				if (light.castShadow) {
					const shadow = light.shadow;
					const shadowUniforms = shadowCache.get(light);
					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;
					state.directionalShadow[directionalLength] = shadowUniforms;
					state.directionalShadowMap[directionalLength] = shadowMap;
					state.directionalShadowMatrix[directionalLength] = light.shadow.matrix;
					numDirectionalShadows++;
				}
				state.directional[directionalLength] = uniforms;
				directionalLength++;
			} else if (light.isSpotLight) {
				const uniforms = cache.get(light);
				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.color.copy(color).multiplyScalar(intensity);
				uniforms.distance = distance;
				uniforms.coneCos = Math.cos(light.angle);
				uniforms.penumbraCos = Math.cos(light.angle * (1 - light.penumbra));
				uniforms.decay = light.decay;
				state.spot[spotLength] = uniforms;
				const shadow = light.shadow;
				if (light.map) {
					state.spotLightMap[numSpotMaps] = light.map;
					numSpotMaps++;
					shadow.updateMatrices(light);
					if (light.castShadow) numSpotShadowsWithMaps++;
				}
				state.spotLightMatrix[spotLength] = shadow.matrix;
				if (light.castShadow) {
					const shadowUniforms = shadowCache.get(light);
					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;
					state.spotShadow[spotLength] = shadowUniforms;
					state.spotShadowMap[spotLength] = shadowMap;
					numSpotShadows++;
				}
				spotLength++;
			} else if (light.isRectAreaLight) {
				const uniforms = cache.get(light);
				uniforms.color.copy(color).multiplyScalar(intensity);
				uniforms.halfWidth.set(light.width * .5, 0, 0);
				uniforms.halfHeight.set(0, light.height * .5, 0);
				state.rectArea[rectAreaLength] = uniforms;
				rectAreaLength++;
			} else if (light.isPointLight) {
				const uniforms = cache.get(light);
				uniforms.color.copy(light.color).multiplyScalar(light.intensity);
				uniforms.distance = light.distance;
				uniforms.decay = light.decay;
				if (light.castShadow) {
					const shadow = light.shadow;
					const shadowUniforms = shadowCache.get(light);
					shadowUniforms.shadowIntensity = shadow.intensity;
					shadowUniforms.shadowBias = shadow.bias;
					shadowUniforms.shadowNormalBias = shadow.normalBias;
					shadowUniforms.shadowRadius = shadow.radius;
					shadowUniforms.shadowMapSize = shadow.mapSize;
					shadowUniforms.shadowCameraNear = shadow.camera.near;
					shadowUniforms.shadowCameraFar = shadow.camera.far;
					state.pointShadow[pointLength] = shadowUniforms;
					state.pointShadowMap[pointLength] = shadowMap;
					state.pointShadowMatrix[pointLength] = light.shadow.matrix;
					numPointShadows++;
				}
				state.point[pointLength] = uniforms;
				pointLength++;
			} else if (light.isHemisphereLight) {
				const uniforms = cache.get(light);
				uniforms.skyColor.copy(light.color).multiplyScalar(intensity);
				uniforms.groundColor.copy(light.groundColor).multiplyScalar(intensity);
				state.hemi[hemiLength] = uniforms;
				hemiLength++;
			}
		}
		if (rectAreaLength > 0) {
			if (extensions.has("OES_texture_float_linear") === true) {
				state.rectAreaLTC1 = UniformsLib.LTC_FLOAT_1;
				state.rectAreaLTC2 = UniformsLib.LTC_FLOAT_2;
			} else {
				state.rectAreaLTC1 = UniformsLib.LTC_HALF_1;
				state.rectAreaLTC2 = UniformsLib.LTC_HALF_2;
			}
		}
		state.ambient[0] = r;
		state.ambient[1] = g;
		state.ambient[2] = b;
		const hash = state.hash;
		if (hash.sunLength !== sunLength || hash.directionalLength !== directionalLength || hash.pointLength !== pointLength || hash.spotLength !== spotLength || hash.rectAreaLength !== rectAreaLength || hash.hemiLength !== hemiLength || hash.numSunShadows !== numSunShadows || hash.numDirectionalShadows !== numDirectionalShadows || hash.numPointShadows !== numPointShadows || hash.numSpotShadows !== numSpotShadows || hash.numSpotMaps !== numSpotMaps || hash.numLightProbes !== numLightProbes) {
			state.sun.length = sunLength;
			state.directional.length = directionalLength;
			state.spot.length = spotLength;
			state.rectArea.length = rectAreaLength;
			state.point.length = pointLength;
			state.hemi.length = hemiLength;
			state.sunShadow.length = numSunShadows;
			state.sunShadowMap.length = numSunShadows;
			state.sunShadowMatrix.length = numSunShadowCascades;
			state.sunShadowCascade.length = numSunShadowCascades;
			state.directionalShadow.length = numDirectionalShadows;
			state.directionalShadowMap.length = numDirectionalShadows;
			state.directionalShadowMatrix.length = numDirectionalShadows;
			state.pointShadow.length = numPointShadows;
			state.pointShadowMap.length = numPointShadows;
			state.pointShadowMatrix.length = numPointShadows;
			state.spotShadow.length = numSpotShadows;
			state.spotShadowMap.length = numSpotShadows;
			state.spotLightMatrix.length = numSpotShadows + numSpotMaps - numSpotShadowsWithMaps;
			state.spotLightMap.length = numSpotMaps;
			state.numSpotLightShadowsWithMaps = numSpotShadowsWithMaps;
			state.numLightProbes = numLightProbes;
			hash.sunLength = sunLength;
			hash.directionalLength = directionalLength;
			hash.pointLength = pointLength;
			hash.spotLength = spotLength;
			hash.rectAreaLength = rectAreaLength;
			hash.hemiLength = hemiLength;
			hash.numSunShadows = numSunShadows;
			hash.numDirectionalShadows = numDirectionalShadows;
			hash.numPointShadows = numPointShadows;
			hash.numSpotShadows = numSpotShadows;
			hash.numSpotMaps = numSpotMaps;
			hash.numLightProbes = numLightProbes;
			state.version = nextVersion++;
		}
	}
	function setupView(lights, camera) {
		let sunLength = 0;
		let directionalLength = 0;
		let pointLength = 0;
		let spotLength = 0;
		let rectAreaLength = 0;
		let hemiLength = 0;
		const viewMatrix = camera.matrixWorldInverse;
		for (let i = 0, l = lights.length; i < l; i++) {
			const light = lights[i];
			if (light.isSunLight) {
				const uniforms = state.sun[sunLength];
				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				uniforms.direction.transformDirection(viewMatrix);
				sunLength++;
			} else if (light.isDirectionalLight) {
				const uniforms = state.directional[directionalLength];
				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				vector3.setFromMatrixPosition(light.target.matrixWorld);
				uniforms.direction.sub(vector3);
				uniforms.direction.transformDirection(viewMatrix);
				directionalLength++;
			} else if (light.isSpotLight) {
				const uniforms = state.spot[spotLength];
				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);
				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				vector3.setFromMatrixPosition(light.target.matrixWorld);
				uniforms.direction.sub(vector3);
				uniforms.direction.transformDirection(viewMatrix);
				spotLength++;
			} else if (light.isRectAreaLight) {
				const uniforms = state.rectArea[rectAreaLength];
				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);
				matrix42.identity();
				matrix4.copy(light.matrixWorld);
				matrix4.premultiply(viewMatrix);
				matrix42.extractRotation(matrix4);
				uniforms.halfWidth.set(light.width * .5, 0, 0);
				uniforms.halfHeight.set(0, light.height * .5, 0);
				uniforms.halfWidth.applyMatrix4(matrix42);
				uniforms.halfHeight.applyMatrix4(matrix42);
				rectAreaLength++;
			} else if (light.isPointLight) {
				const uniforms = state.point[pointLength];
				uniforms.position.setFromMatrixPosition(light.matrixWorld);
				uniforms.position.applyMatrix4(viewMatrix);
				pointLength++;
			} else if (light.isHemisphereLight) {
				const uniforms = state.hemi[hemiLength];
				uniforms.direction.setFromMatrixPosition(light.matrixWorld);
				uniforms.direction.transformDirection(viewMatrix);
				hemiLength++;
			}
		}
	}
	return {
		setup,
		setupView,
		state
	};
}
function WebGLRenderState(extensions) {
	const lights = new WebGLLights(extensions);
	const lightsArray = [];
	const shadowsArray = [];
	const lightProbeGridArray = [];
	function init(camera) {
		state.camera = camera;
		lightsArray.length = 0;
		shadowsArray.length = 0;
		lightProbeGridArray.length = 0;
	}
	function pushLight(light) {
		lightsArray.push(light);
	}
	function pushShadow(shadowLight) {
		shadowsArray.push(shadowLight);
	}
	function pushLightProbeGrid(volume) {
		lightProbeGridArray.push(volume);
	}
	function setupLights() {
		lights.setup(lightsArray);
	}
	function setupLightsView(camera) {
		lights.setupView(lightsArray, camera);
	}
	const state = {
		lightsArray,
		shadowsArray,
		lightProbeGridArray,
		camera: null,
		lights,
		transmissionRenderTarget: {},
		textureUnits: 0
	};
	return {
		init,
		state,
		setupLights,
		setupLightsView,
		pushLight,
		pushShadow,
		pushLightProbeGrid
	};
}
function WebGLRenderStates(extensions) {
	let renderStates = /* @__PURE__ */ new WeakMap();
	function get(scene, renderCallDepth = 0) {
		const renderStateArray = renderStates.get(scene);
		let renderState;
		if (renderStateArray === void 0) {
			renderState = new WebGLRenderState(extensions);
			renderStates.set(scene, [renderState]);
		} else if (renderCallDepth >= renderStateArray.length) {
			renderState = new WebGLRenderState(extensions);
			renderStateArray.push(renderState);
		} else renderState = renderStateArray[renderCallDepth];
		return renderState;
	}
	function dispose() {
		renderStates = /* @__PURE__ */ new WeakMap();
	}
	return {
		get,
		dispose
	};
}
var vertex = "void main() {\n	gl_Position = vec4( position, 1.0 );\n}";
var fragment = "uniform sampler2D shadow_pass;\nuniform vec2 resolution;\nuniform float radius;\nvoid main() {\n	const float samples = float( VSM_SAMPLES );\n	float mean = 0.0;\n	float squared_mean = 0.0;\n	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );\n	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;\n	for ( float i = 0.0; i < samples; i ++ ) {\n		float uvOffset = uvStart + i * uvStride;\n		#ifdef HORIZONTAL_PASS\n			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;\n			mean += distribution.x;\n			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;\n		#else\n			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;\n			mean += depth;\n			squared_mean += depth * depth;\n		#endif\n	}\n	mean = mean / samples;\n	squared_mean = squared_mean / samples;\n	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );\n	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );\n}";
var _cubeDirections = [
	/*@__PURE__*/ new Vector3(1, 0, 0),
	/*@__PURE__*/ new Vector3(-1, 0, 0),
	/*@__PURE__*/ new Vector3(0, 1, 0),
	/*@__PURE__*/ new Vector3(0, -1, 0),
	/*@__PURE__*/ new Vector3(0, 0, 1),
	/*@__PURE__*/ new Vector3(0, 0, -1)
];
var _cubeUps = [
	/*@__PURE__*/ new Vector3(0, -1, 0),
	/*@__PURE__*/ new Vector3(0, -1, 0),
	/*@__PURE__*/ new Vector3(0, 0, 1),
	/*@__PURE__*/ new Vector3(0, 0, -1),
	/*@__PURE__*/ new Vector3(0, -1, 0),
	/*@__PURE__*/ new Vector3(0, -1, 0)
];
var _projScreenMatrix = /*@__PURE__*/ new Matrix4();
var _lightPositionWorld = /*@__PURE__*/ new Vector3();
var _lookTarget = /*@__PURE__*/ new Vector3();
function WebGLShadowMap(renderer, objects, capabilities) {
	let _frustum = new Frustum();
	const _shadowMapSize = new Vector2(), _viewportSize = new Vector2(), _viewport = new Vector4(), _depthMaterial = new MeshDepthMaterial(), _distanceMaterial = new MeshDistanceMaterial(), _materialCache = {}, _maxTextureSize = capabilities.maxTextureSize;
	const shadowSide = {
		[0]: 1,
		[1]: 0,
		[2]: 2
	};
	const shadowMaterialVertical = new ShaderMaterial({
		defines: { VSM_SAMPLES: 8 },
		uniforms: {
			shadow_pass: { value: null },
			resolution: { value: new Vector2() },
			radius: { value: 4 }
		},
		vertexShader: vertex,
		fragmentShader: fragment
	});
	const shadowMaterialHorizontal = shadowMaterialVertical.clone();
	shadowMaterialHorizontal.defines.HORIZONTAL_PASS = 1;
	const fullScreenTri = new BufferGeometry();
	fullScreenTri.setAttribute("position", new BufferAttribute(new Float32Array([
		-1,
		-1,
		.5,
		3,
		-1,
		.5,
		-1,
		3,
		.5
	]), 3));
	const fullScreenMesh = new Mesh(fullScreenTri, shadowMaterialVertical);
	const scope = this;
	this.enabled = false;
	this.autoUpdate = true;
	this.needsUpdate = false;
	this.type = 1;
	let _previousType = this.type;
	this.render = function(lights, scene, camera) {
		if (scope.enabled === false) return;
		if (scope.autoUpdate === false && scope.needsUpdate === false) return;
		if (lights.length === 0) return;
		if (this.type === 2) {
			warn("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.");
			this.type = 1;
		}
		const currentRenderTarget = renderer.getRenderTarget();
		const activeCubeFace = renderer.getActiveCubeFace();
		const activeMipmapLevel = renderer.getActiveMipmapLevel();
		const _state = renderer.state;
		_state.setBlending(0);
		if (_state.buffers.depth.getReversed() === true) _state.buffers.color.setClear(0, 0, 0, 0);
		else _state.buffers.color.setClear(1, 1, 1, 1);
		_state.buffers.depth.setTest(true);
		_state.setScissorTest(false);
		const typeChanged = _previousType !== this.type;
		if (typeChanged) scene.traverse(function(object) {
			if (object.material) {
				if (Array.isArray(object.material)) object.material.forEach((mat) => mat.needsUpdate = true);
				else object.material.needsUpdate = true;
			}
		});
		for (let i = 0, il = lights.length; i < il; i++) {
			const light = lights[i];
			const shadow = light.shadow;
			if (shadow === void 0) {
				warn("WebGLShadowMap:", light, "has no shadow.");
				continue;
			}
			if (shadow.autoUpdate === false && shadow.needsUpdate === false) continue;
			_shadowMapSize.copy(shadow.mapSize);
			const shadowFrameExtents = shadow.getFrameExtents();
			_shadowMapSize.multiply(shadowFrameExtents);
			_viewportSize.copy(shadow.mapSize);
			if (_shadowMapSize.x > _maxTextureSize || _shadowMapSize.y > _maxTextureSize) {
				if (_shadowMapSize.x > _maxTextureSize) {
					_viewportSize.x = Math.floor(_maxTextureSize / shadowFrameExtents.x);
					_shadowMapSize.x = _viewportSize.x * shadowFrameExtents.x;
					shadow.mapSize.x = _viewportSize.x;
				}
				if (_shadowMapSize.y > _maxTextureSize) {
					_viewportSize.y = Math.floor(_maxTextureSize / shadowFrameExtents.y);
					_shadowMapSize.y = _viewportSize.y * shadowFrameExtents.y;
					shadow.mapSize.y = _viewportSize.y;
				}
			}
			const reversedDepthBuffer = renderer.state.buffers.depth.getReversed();
			shadow.camera._reversedDepth = reversedDepthBuffer;
			if (shadow.map === null || typeChanged === true) {
				if (shadow.map !== null) {
					if (shadow.map.depthTexture !== null) {
						shadow.map.depthTexture.dispose();
						shadow.map.depthTexture = null;
					}
					shadow.map.dispose();
				}
				if (this.type === 3) {
					if (light.isPointLight) {
						warn("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");
						continue;
					}
					shadow.map = new WebGLRenderTarget(_shadowMapSize.x, _shadowMapSize.y, {
						format: RGFormat,
						type: HalfFloatType,
						minFilter: LinearFilter,
						magFilter: LinearFilter,
						generateMipmaps: false
					});
					shadow.map.texture.name = light.name + ".shadowMap";
					shadow.map.depthTexture = new DepthTexture(_shadowMapSize.x, _shadowMapSize.y, FloatType);
					shadow.map.depthTexture.name = light.name + ".shadowMapDepth";
					shadow.map.depthTexture.format = DepthFormat;
					shadow.map.depthTexture.compareFunction = null;
					shadow.map.depthTexture.minFilter = NearestFilter;
					shadow.map.depthTexture.magFilter = NearestFilter;
				} else {
					if (light.isPointLight) {
						shadow.map = new WebGLCubeRenderTarget(_shadowMapSize.x);
						shadow.map.depthTexture = new CubeDepthTexture(_shadowMapSize.x, UnsignedIntType);
					} else {
						shadow.map = new WebGLRenderTarget(_shadowMapSize.x, _shadowMapSize.y);
						shadow.map.depthTexture = new DepthTexture(_shadowMapSize.x, _shadowMapSize.y, UnsignedIntType);
					}
					shadow.map.depthTexture.name = light.name + ".shadowMap";
					shadow.map.depthTexture.format = DepthFormat;
					if (this.type === 1) {
						shadow.map.depthTexture.compareFunction = reversedDepthBuffer ? 518 : 515;
						shadow.map.depthTexture.minFilter = LinearFilter;
						shadow.map.depthTexture.magFilter = LinearFilter;
					} else {
						shadow.map.depthTexture.compareFunction = null;
						shadow.map.depthTexture.minFilter = NearestFilter;
						shadow.map.depthTexture.magFilter = NearestFilter;
					}
				}
				shadow.camera.updateProjectionMatrix();
			}
			if (shadow.map.isWebGLCubeRenderTarget !== true && (shadow.map.width !== _shadowMapSize.x || shadow.map.height !== _shadowMapSize.y)) shadow.map.setSize(_shadowMapSize.x, _shadowMapSize.y);
			const faceCount = shadow.map.isWebGLCubeRenderTarget ? 6 : shadow.getViewportCount();
			if (light.isPointLight !== true) shadow.updateMatrices(light, camera);
			for (let face = 0; face < faceCount; face++) {
				const shadowCamera = shadow.getCamera(face);
				if (light.isPointLight) {
					const camera = shadow.camera;
					const shadowMatrix = shadow.matrix;
					const far = light.distance || camera.far;
					if (far !== camera.far) {
						camera.far = far;
						camera.updateProjectionMatrix();
					}
					_lightPositionWorld.setFromMatrixPosition(light.matrixWorld);
					camera.position.copy(_lightPositionWorld);
					_lookTarget.copy(camera.position);
					_lookTarget.add(_cubeDirections[face]);
					camera.up.copy(_cubeUps[face]);
					camera.lookAt(_lookTarget);
					camera.updateMatrixWorld();
					shadowMatrix.makeTranslation(-_lightPositionWorld.x, -_lightPositionWorld.y, -_lightPositionWorld.z);
					_projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
					shadow._frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);
				}
				if (shadow.map.isWebGLCubeRenderTarget) {
					renderer.setRenderTarget(shadow.map, face);
					renderer.clear();
				} else {
					if (face === 0) {
						renderer.setRenderTarget(shadow.map);
						renderer.clear();
					}
					const viewport = shadow.getViewport(face);
					_viewport.set(_viewportSize.x * viewport.x, _viewportSize.y * viewport.y, _viewportSize.x * viewport.z, _viewportSize.y * viewport.w);
					_state.viewport(_viewport);
				}
				_frustum = shadow.getFrustum(face);
				renderObject(scene, camera, shadowCamera, light, this.type);
			}
			if (shadow.isPointLightShadow !== true && this.type === 3) VSMPass(shadow, camera);
			shadow.needsUpdate = false;
		}
		_previousType = this.type;
		scope.needsUpdate = false;
		renderer.setRenderTarget(currentRenderTarget, activeCubeFace, activeMipmapLevel);
	};
	function VSMPass(shadow, camera) {
		const geometry = objects.update(fullScreenMesh);
		if (shadowMaterialVertical.defines.VSM_SAMPLES !== shadow.blurSamples) {
			shadowMaterialVertical.defines.VSM_SAMPLES = shadow.blurSamples;
			shadowMaterialHorizontal.defines.VSM_SAMPLES = shadow.blurSamples;
			shadowMaterialVertical.needsUpdate = true;
			shadowMaterialHorizontal.needsUpdate = true;
		}
		if (shadow.mapPass === null) shadow.mapPass = new WebGLRenderTarget(_shadowMapSize.x, _shadowMapSize.y, {
			format: RGFormat,
			type: HalfFloatType
		});
		else if (shadow.mapPass.width !== shadow.map.width || shadow.mapPass.height !== shadow.map.height) shadow.mapPass.setSize(shadow.map.width, shadow.map.height);
		shadowMaterialVertical.uniforms.shadow_pass.value = shadow.map.depthTexture;
		shadowMaterialVertical.uniforms.resolution.value.set(shadow.map.width, shadow.map.height);
		shadowMaterialVertical.uniforms.radius.value = shadow.radius;
		renderer.setRenderTarget(shadow.mapPass);
		renderer.clear();
		renderer.renderBufferDirect(camera, null, geometry, shadowMaterialVertical, fullScreenMesh, null);
		shadowMaterialHorizontal.uniforms.shadow_pass.value = shadow.mapPass.texture;
		shadowMaterialHorizontal.uniforms.resolution.value.set(shadow.map.width, shadow.map.height);
		shadowMaterialHorizontal.uniforms.radius.value = shadow.radius;
		renderer.setRenderTarget(shadow.map);
		renderer.clear();
		renderer.renderBufferDirect(camera, null, geometry, shadowMaterialHorizontal, fullScreenMesh, null);
	}
	function getDepthMaterial(object, material, light, type) {
		let result = null;
		const customMaterial = light.isPointLight === true ? object.customDistanceMaterial : object.customDepthMaterial;
		if (customMaterial !== void 0) result = customMaterial;
		else {
			result = light.isPointLight === true ? _distanceMaterial : _depthMaterial;
			if (renderer.localClippingEnabled && material.clipShadows === true && Array.isArray(material.clippingPlanes) && material.clippingPlanes.length !== 0 || material.displacementMap && material.displacementScale !== 0 || material.alphaMap && material.alphaTest > 0 || material.map && material.alphaTest > 0 || material.alphaToCoverage === true) {
				const keyA = result.uuid, keyB = material.uuid;
				let materialsForVariant = _materialCache[keyA];
				if (materialsForVariant === void 0) {
					materialsForVariant = {};
					_materialCache[keyA] = materialsForVariant;
				}
				let cachedMaterial = materialsForVariant[keyB];
				if (cachedMaterial === void 0) {
					cachedMaterial = result.clone();
					materialsForVariant[keyB] = cachedMaterial;
					material.addEventListener("dispose", onMaterialDispose);
				}
				result = cachedMaterial;
			}
		}
		result.visible = material.visible;
		result.wireframe = material.wireframe;
		if (type === 3) result.side = material.shadowSide !== null ? material.shadowSide : material.side;
		else result.side = material.shadowSide !== null ? material.shadowSide : shadowSide[material.side];
		result.alphaMap = material.alphaMap;
		result.alphaTest = material.alphaToCoverage === true ? .5 : material.alphaTest;
		result.map = material.map;
		result.clipShadows = material.clipShadows;
		result.clippingPlanes = material.clippingPlanes;
		result.clipIntersection = material.clipIntersection;
		result.displacementMap = material.displacementMap;
		result.displacementScale = material.displacementScale;
		result.displacementBias = material.displacementBias;
		result.wireframeLinewidth = material.wireframeLinewidth;
		result.linewidth = material.linewidth;
		if (light.isPointLight === true && result.isMeshDistanceMaterial === true) {
			const materialProperties = renderer.properties.get(result);
			materialProperties.light = light;
		}
		return result;
	}
	function renderObject(object, camera, shadowCamera, light, type) {
		if (object.visible === false) return;
		if (object.layers.test(camera.layers) && (object.isMesh || object.isLine || object.isPoints)) {
			if ((object.castShadow || object.receiveShadow && type === 3) && (!object.frustumCulled || object.intersectsFrustum(_frustum))) {
				object.modelViewMatrix.multiplyMatrices(shadowCamera.matrixWorldInverse, object.matrixWorld);
				const geometry = objects.update(object);
				const material = object.material;
				if (Array.isArray(material)) {
					const groups = geometry.groups;
					for (let k = 0, kl = groups.length; k < kl; k++) {
						const group = groups[k];
						const groupMaterial = material[group.materialIndex];
						if (groupMaterial && groupMaterial.visible) {
							const depthMaterial = getDepthMaterial(object, groupMaterial, light, type);
							object.onBeforeShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, group);
							renderer.renderBufferDirect(shadowCamera, null, geometry, depthMaterial, object, group);
							object.onAfterShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, group);
						}
					}
				} else if (material.visible) {
					const depthMaterial = getDepthMaterial(object, material, light, type);
					object.onBeforeShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, null);
					renderer.renderBufferDirect(shadowCamera, null, geometry, depthMaterial, object, null);
					object.onAfterShadow(renderer, object, camera, shadowCamera, geometry, depthMaterial, null);
				}
			}
		}
		const children = object.children;
		for (let i = 0, l = children.length; i < l; i++) renderObject(children[i], camera, shadowCamera, light, type);
	}
	function onMaterialDispose(event) {
		event.target.removeEventListener("dispose", onMaterialDispose);
		for (const id in _materialCache) {
			const cache = _materialCache[id];
			const uuid = event.target.uuid;
			if (uuid in cache) {
				cache[uuid].dispose();
				delete cache[uuid];
			}
		}
	}
}
function WebGLState(gl, extensions) {
	function ColorBuffer() {
		let locked = false;
		const color = new Vector4();
		let currentColorMask = null;
		const currentColorClear = new Vector4(0, 0, 0, 0);
		return {
			setMask: function(colorMask) {
				if (currentColorMask !== colorMask && !locked) {
					gl.colorMask(colorMask, colorMask, colorMask, colorMask);
					currentColorMask = colorMask;
				}
			},
			setLocked: function(lock) {
				locked = lock;
			},
			setClear: function(r, g, b, a, premultipliedAlpha) {
				if (premultipliedAlpha === true) {
					r *= a;
					g *= a;
					b *= a;
				}
				color.set(r, g, b, a);
				if (currentColorClear.equals(color) === false) {
					gl.clearColor(r, g, b, a);
					currentColorClear.copy(color);
				}
			},
			reset: function() {
				locked = false;
				currentColorMask = null;
				currentColorClear.set(-1, 0, 0, 0);
			}
		};
	}
	function DepthBuffer() {
		let locked = false;
		let currentReversed = false;
		let currentDepthMask = null;
		let currentDepthFunc = null;
		let currentDepthClear = null;
		return {
			setReversed: function(reversed) {
				if (currentReversed !== reversed) {
					const ext = extensions.get("EXT_clip_control");
					if (reversed) ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.ZERO_TO_ONE_EXT);
					else ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.NEGATIVE_ONE_TO_ONE_EXT);
					currentReversed = reversed;
					const oldDepth = currentDepthClear;
					currentDepthClear = null;
					this.setClear(oldDepth);
				}
			},
			getReversed: function() {
				return currentReversed;
			},
			setTest: function(depthTest) {
				if (depthTest) enable(gl.DEPTH_TEST);
				else disable(gl.DEPTH_TEST);
			},
			setMask: function(depthMask) {
				if (currentDepthMask !== depthMask && !locked) {
					gl.depthMask(depthMask);
					currentDepthMask = depthMask;
				}
			},
			setFunc: function(depthFunc) {
				if (currentReversed) depthFunc = ReversedDepthFuncs[depthFunc];
				if (currentDepthFunc !== depthFunc) {
					switch (depthFunc) {
						case 0:
							gl.depthFunc(gl.NEVER);
							break;
						case 1:
							gl.depthFunc(gl.ALWAYS);
							break;
						case 2:
							gl.depthFunc(gl.LESS);
							break;
						case 3:
							gl.depthFunc(gl.LEQUAL);
							break;
						case 4:
							gl.depthFunc(gl.EQUAL);
							break;
						case 5:
							gl.depthFunc(gl.GEQUAL);
							break;
						case 6:
							gl.depthFunc(gl.GREATER);
							break;
						case 7:
							gl.depthFunc(gl.NOTEQUAL);
							break;
						default: gl.depthFunc(gl.LEQUAL);
					}
					currentDepthFunc = depthFunc;
				}
			},
			setLocked: function(lock) {
				locked = lock;
			},
			setClear: function(depth) {
				if (currentDepthClear !== depth) {
					currentDepthClear = depth;
					if (currentReversed) depth = 1 - depth;
					gl.clearDepth(depth);
				}
			},
			reset: function() {
				locked = false;
				currentDepthMask = null;
				currentDepthFunc = null;
				currentDepthClear = null;
				currentReversed = false;
			}
		};
	}
	function StencilBuffer() {
		let locked = false;
		let currentStencilMask = null;
		let currentStencilFunc = null;
		let currentStencilRef = null;
		let currentStencilFuncMask = null;
		let currentStencilFail = null;
		let currentStencilZFail = null;
		let currentStencilZPass = null;
		let currentStencilClear = null;
		return {
			setTest: function(stencilTest) {
				if (!locked) {
					if (stencilTest) enable(gl.STENCIL_TEST);
					else disable(gl.STENCIL_TEST);
				}
			},
			setMask: function(stencilMask) {
				if (currentStencilMask !== stencilMask && !locked) {
					gl.stencilMask(stencilMask);
					currentStencilMask = stencilMask;
				}
			},
			setFunc: function(stencilFunc, stencilRef, stencilMask) {
				if (currentStencilFunc !== stencilFunc || currentStencilRef !== stencilRef || currentStencilFuncMask !== stencilMask) {
					gl.stencilFunc(stencilFunc, stencilRef, stencilMask);
					currentStencilFunc = stencilFunc;
					currentStencilRef = stencilRef;
					currentStencilFuncMask = stencilMask;
				}
			},
			setOp: function(stencilFail, stencilZFail, stencilZPass) {
				if (currentStencilFail !== stencilFail || currentStencilZFail !== stencilZFail || currentStencilZPass !== stencilZPass) {
					gl.stencilOp(stencilFail, stencilZFail, stencilZPass);
					currentStencilFail = stencilFail;
					currentStencilZFail = stencilZFail;
					currentStencilZPass = stencilZPass;
				}
			},
			setLocked: function(lock) {
				locked = lock;
			},
			setClear: function(stencil) {
				if (currentStencilClear !== stencil) {
					gl.clearStencil(stencil);
					currentStencilClear = stencil;
				}
			},
			reset: function() {
				locked = false;
				currentStencilMask = null;
				currentStencilFunc = null;
				currentStencilRef = null;
				currentStencilFuncMask = null;
				currentStencilFail = null;
				currentStencilZFail = null;
				currentStencilZPass = null;
				currentStencilClear = null;
			}
		};
	}
	const colorBuffer = new ColorBuffer();
	const depthBuffer = new DepthBuffer();
	const stencilBuffer = new StencilBuffer();
	const uboBindings = /* @__PURE__ */ new WeakMap();
	const uboProgramMap = /* @__PURE__ */ new WeakMap();
	let enabledCapabilities = {};
	let parameters = {};
	let currentBoundFramebuffers = {};
	let currentDrawbuffers = /* @__PURE__ */ new WeakMap();
	let defaultDrawbuffers = [];
	let currentProgram = null;
	let currentBlendingEnabled = false;
	let currentBlending = null;
	let currentBlendEquation = null;
	let currentBlendSrc = null;
	let currentBlendDst = null;
	let currentBlendEquationAlpha = null;
	let currentBlendSrcAlpha = null;
	let currentBlendDstAlpha = null;
	let currentBlendColor = new Color(0, 0, 0);
	let currentBlendAlpha = 0;
	let currentPremultipledAlpha = false;
	let currentFlipSided = null;
	let currentCullFace = null;
	let currentLineWidth = null;
	let currentPolygonOffsetFactor = null;
	let currentPolygonOffsetUnits = null;
	const maxTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	let lineWidthAvailable = false;
	let version = 0;
	const glVersion = gl.getParameter(gl.VERSION);
	if (glVersion.indexOf("WebGL") !== -1) {
		version = parseFloat(/^WebGL (\d)/.exec(glVersion)[1]);
		lineWidthAvailable = version >= 1;
	} else if (glVersion.indexOf("OpenGL ES") !== -1) {
		version = parseFloat(/^OpenGL ES (\d)/.exec(glVersion)[1]);
		lineWidthAvailable = version >= 2;
	}
	let currentTextureSlot = null;
	let currentBoundTextures = {};
	const scissorParam = gl.getParameter(gl.SCISSOR_BOX);
	const viewportParam = gl.getParameter(gl.VIEWPORT);
	const currentScissor = new Vector4().fromArray(scissorParam);
	const currentViewport = new Vector4().fromArray(viewportParam);
	function createTexture(type, target, count, dimensions) {
		const data = /* @__PURE__ */ new Uint8Array(4);
		const texture = gl.createTexture();
		gl.bindTexture(type, texture);
		gl.texParameteri(type, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(type, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		for (let i = 0; i < count; i++) if (type === gl.TEXTURE_3D || type === gl.TEXTURE_2D_ARRAY) gl.texImage3D(target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		else gl.texImage2D(target + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		return texture;
	}
	const emptyTextures = {};
	emptyTextures[gl.TEXTURE_2D] = createTexture(gl.TEXTURE_2D, gl.TEXTURE_2D, 1);
	emptyTextures[gl.TEXTURE_CUBE_MAP] = createTexture(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 6);
	emptyTextures[gl.TEXTURE_2D_ARRAY] = createTexture(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_2D_ARRAY, 1, 1);
	emptyTextures[gl.TEXTURE_3D] = createTexture(gl.TEXTURE_3D, gl.TEXTURE_3D, 1, 1);
	colorBuffer.setClear(0, 0, 0, 1);
	depthBuffer.setClear(1);
	stencilBuffer.setClear(0);
	enable(gl.DEPTH_TEST);
	depthBuffer.setFunc(3);
	setFlipSided(false);
	setCullFace(1);
	enable(gl.CULL_FACE);
	setBlending(0);
	function enable(id) {
		if (enabledCapabilities[id] !== true) {
			gl.enable(id);
			enabledCapabilities[id] = true;
		}
	}
	function disable(id) {
		if (enabledCapabilities[id] !== false) {
			gl.disable(id);
			enabledCapabilities[id] = false;
		}
	}
	function bindFramebuffer(target, framebuffer) {
		if (currentBoundFramebuffers[target] !== framebuffer) {
			gl.bindFramebuffer(target, framebuffer);
			currentBoundFramebuffers[target] = framebuffer;
			if (target === gl.DRAW_FRAMEBUFFER) currentBoundFramebuffers[gl.FRAMEBUFFER] = framebuffer;
			if (target === gl.FRAMEBUFFER) currentBoundFramebuffers[gl.DRAW_FRAMEBUFFER] = framebuffer;
			return true;
		}
		return false;
	}
	function drawBuffers(renderTarget, framebuffer) {
		let drawBuffers = defaultDrawbuffers;
		let needsUpdate = false;
		if (renderTarget) {
			drawBuffers = currentDrawbuffers.get(framebuffer);
			if (drawBuffers === void 0) {
				drawBuffers = [];
				currentDrawbuffers.set(framebuffer, drawBuffers);
			}
			const textures = renderTarget.textures;
			if (drawBuffers.length !== textures.length || drawBuffers[0] !== gl.COLOR_ATTACHMENT0) {
				for (let i = 0, il = textures.length; i < il; i++) drawBuffers[i] = gl.COLOR_ATTACHMENT0 + i;
				drawBuffers.length = textures.length;
				needsUpdate = true;
			}
		} else if (drawBuffers[0] !== gl.BACK) {
			drawBuffers[0] = gl.BACK;
			needsUpdate = true;
		}
		if (needsUpdate) gl.drawBuffers(drawBuffers);
	}
	function useProgram(program) {
		if (currentProgram !== program) {
			gl.useProgram(program);
			currentProgram = program;
			return true;
		}
		return false;
	}
	const equationToGL = {
		[100]: gl.FUNC_ADD,
		[101]: gl.FUNC_SUBTRACT,
		[102]: gl.FUNC_REVERSE_SUBTRACT
	};
	equationToGL[103] = gl.MIN;
	equationToGL[104] = gl.MAX;
	const factorToGL = {
		[200]: gl.ZERO,
		[201]: gl.ONE,
		[202]: gl.SRC_COLOR,
		[204]: gl.SRC_ALPHA,
		[210]: gl.SRC_ALPHA_SATURATE,
		[208]: gl.DST_COLOR,
		[206]: gl.DST_ALPHA,
		[203]: gl.ONE_MINUS_SRC_COLOR,
		[205]: gl.ONE_MINUS_SRC_ALPHA,
		[209]: gl.ONE_MINUS_DST_COLOR,
		[207]: gl.ONE_MINUS_DST_ALPHA,
		[211]: gl.CONSTANT_COLOR,
		[212]: gl.ONE_MINUS_CONSTANT_COLOR,
		[213]: gl.CONSTANT_ALPHA,
		[214]: gl.ONE_MINUS_CONSTANT_ALPHA
	};
	function setBlending(blending, blendEquation, blendSrc, blendDst, blendEquationAlpha, blendSrcAlpha, blendDstAlpha, blendColor, blendAlpha, premultipliedAlpha) {
		if (blending === 0) {
			if (currentBlendingEnabled === true) {
				disable(gl.BLEND);
				currentBlendingEnabled = false;
			}
			return;
		}
		if (currentBlendingEnabled === false) {
			enable(gl.BLEND);
			currentBlendingEnabled = true;
		}
		if (blending !== 5) {
			if (blending !== currentBlending || premultipliedAlpha !== currentPremultipledAlpha) {
				if (currentBlendEquation !== 100 || currentBlendEquationAlpha !== 100) {
					gl.blendEquation(gl.FUNC_ADD);
					currentBlendEquation = 100;
					currentBlendEquationAlpha = 100;
				}
				if (premultipliedAlpha) switch (blending) {
					case 1:
						gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						gl.blendFunc(gl.ONE, gl.ONE);
						break;
					case 3:
						gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
						break;
					case 4:
						gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
						break;
					default: error("WebGLState: Invalid blending: ", blending);
				}
				else switch (blending) {
					case 1:
						gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
						break;
					case 3:
						error("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
						break;
					case 4:
						error("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
						break;
					default: error("WebGLState: Invalid blending: ", blending);
				}
				currentBlendSrc = null;
				currentBlendDst = null;
				currentBlendSrcAlpha = null;
				currentBlendDstAlpha = null;
				currentBlendColor.set(0, 0, 0);
				currentBlendAlpha = 0;
				currentBlending = blending;
				currentPremultipledAlpha = premultipliedAlpha;
			}
			return;
		}
		blendEquationAlpha = blendEquationAlpha || blendEquation;
		blendSrcAlpha = blendSrcAlpha || blendSrc;
		blendDstAlpha = blendDstAlpha || blendDst;
		if (blendEquation !== currentBlendEquation || blendEquationAlpha !== currentBlendEquationAlpha) {
			gl.blendEquationSeparate(equationToGL[blendEquation], equationToGL[blendEquationAlpha]);
			currentBlendEquation = blendEquation;
			currentBlendEquationAlpha = blendEquationAlpha;
		}
		if (blendSrc !== currentBlendSrc || blendDst !== currentBlendDst || blendSrcAlpha !== currentBlendSrcAlpha || blendDstAlpha !== currentBlendDstAlpha) {
			gl.blendFuncSeparate(factorToGL[blendSrc], factorToGL[blendDst], factorToGL[blendSrcAlpha], factorToGL[blendDstAlpha]);
			currentBlendSrc = blendSrc;
			currentBlendDst = blendDst;
			currentBlendSrcAlpha = blendSrcAlpha;
			currentBlendDstAlpha = blendDstAlpha;
		}
		if (blendColor.equals(currentBlendColor) === false || blendAlpha !== currentBlendAlpha) {
			gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendAlpha);
			currentBlendColor.copy(blendColor);
			currentBlendAlpha = blendAlpha;
		}
		currentBlending = blending;
		currentPremultipledAlpha = false;
	}
	function setMaterial(material, frontFaceCW) {
		material.side === 2 ? disable(gl.CULL_FACE) : enable(gl.CULL_FACE);
		let flipSided = material.side === 1;
		if (frontFaceCW) flipSided = !flipSided;
		setFlipSided(flipSided);
		material.blending === 1 && material.transparent === false ? setBlending(0) : setBlending(material.blending, material.blendEquation, material.blendSrc, material.blendDst, material.blendEquationAlpha, material.blendSrcAlpha, material.blendDstAlpha, material.blendColor, material.blendAlpha, material.premultipliedAlpha);
		depthBuffer.setFunc(material.depthFunc);
		depthBuffer.setTest(material.depthTest);
		depthBuffer.setMask(material.depthWrite);
		colorBuffer.setMask(material.colorWrite);
		const stencilWrite = material.stencilWrite;
		stencilBuffer.setTest(stencilWrite);
		if (stencilWrite) {
			stencilBuffer.setMask(material.stencilWriteMask);
			stencilBuffer.setFunc(material.stencilFunc, material.stencilRef, material.stencilFuncMask);
			stencilBuffer.setOp(material.stencilFail, material.stencilZFail, material.stencilZPass);
		}
		setPolygonOffset(material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits);
		material.alphaToCoverage === true ? enable(gl.SAMPLE_ALPHA_TO_COVERAGE) : disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
	}
	function setFlipSided(flipSided) {
		if (currentFlipSided !== flipSided) {
			if (flipSided) gl.frontFace(gl.CW);
			else gl.frontFace(gl.CCW);
			currentFlipSided = flipSided;
		}
	}
	function setCullFace(cullFace) {
		if (cullFace !== 0) {
			enable(gl.CULL_FACE);
			if (cullFace !== currentCullFace) {
				if (cullFace === 1) gl.cullFace(gl.BACK);
				else if (cullFace === 2) gl.cullFace(gl.FRONT);
				else gl.cullFace(gl.FRONT_AND_BACK);
			}
		} else disable(gl.CULL_FACE);
		currentCullFace = cullFace;
	}
	function setLineWidth(width) {
		if (width !== currentLineWidth) {
			if (lineWidthAvailable) gl.lineWidth(width);
			currentLineWidth = width;
		}
	}
	function setPolygonOffset(polygonOffset, factor, units) {
		if (polygonOffset) {
			enable(gl.POLYGON_OFFSET_FILL);
			if (currentPolygonOffsetFactor !== factor || currentPolygonOffsetUnits !== units) {
				currentPolygonOffsetFactor = factor;
				currentPolygonOffsetUnits = units;
				if (depthBuffer.getReversed()) factor = -factor;
				gl.polygonOffset(factor, units);
			}
		} else disable(gl.POLYGON_OFFSET_FILL);
	}
	function setScissorTest(scissorTest) {
		if (scissorTest) enable(gl.SCISSOR_TEST);
		else disable(gl.SCISSOR_TEST);
	}
	function activeTexture(webglSlot) {
		if (webglSlot === void 0) webglSlot = gl.TEXTURE0 + maxTextures - 1;
		if (currentTextureSlot !== webglSlot) {
			gl.activeTexture(webglSlot);
			currentTextureSlot = webglSlot;
		}
	}
	function bindTexture(webglType, webglTexture, webglSlot) {
		if (webglSlot === void 0) {
			if (currentTextureSlot === null) webglSlot = gl.TEXTURE0 + maxTextures - 1;
			else webglSlot = currentTextureSlot;
		}
		let boundTexture = currentBoundTextures[webglSlot];
		if (boundTexture === void 0) {
			boundTexture = {
				type: void 0,
				texture: void 0
			};
			currentBoundTextures[webglSlot] = boundTexture;
		}
		if (boundTexture.type !== webglType || boundTexture.texture !== webglTexture) {
			if (currentTextureSlot !== webglSlot) {
				gl.activeTexture(webglSlot);
				currentTextureSlot = webglSlot;
			}
			gl.bindTexture(webglType, webglTexture || emptyTextures[webglType]);
			boundTexture.type = webglType;
			boundTexture.texture = webglTexture;
		}
	}
	function unbindTexture() {
		const boundTexture = currentBoundTextures[currentTextureSlot];
		if (boundTexture !== void 0 && boundTexture.type !== void 0) {
			gl.bindTexture(boundTexture.type, null);
			boundTexture.type = void 0;
			boundTexture.texture = void 0;
		}
	}
	function compressedTexImage2D() {
		try {
			gl.compressedTexImage2D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function compressedTexImage3D() {
		try {
			gl.compressedTexImage3D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texSubImage2D() {
		try {
			gl.texSubImage2D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texSubImage3D() {
		try {
			gl.texSubImage3D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function compressedTexSubImage2D() {
		try {
			gl.compressedTexSubImage2D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function compressedTexSubImage3D() {
		try {
			gl.compressedTexSubImage3D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texStorage2D() {
		try {
			gl.texStorage2D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texStorage3D() {
		try {
			gl.texStorage3D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texImage2D() {
		try {
			gl.texImage2D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function texImage3D() {
		try {
			gl.texImage3D(...arguments);
		} catch (e) {
			error("WebGLState:", e);
		}
	}
	function getParameter(name) {
		if (parameters[name] !== void 0) return parameters[name];
		else return gl.getParameter(name);
	}
	function pixelStorei(name, value) {
		if (parameters[name] !== value) {
			gl.pixelStorei(name, value);
			parameters[name] = value;
		}
	}
	function scissor(scissor) {
		if (currentScissor.equals(scissor) === false) {
			gl.scissor(scissor.x, scissor.y, scissor.z, scissor.w);
			currentScissor.copy(scissor);
		}
	}
	function viewport(viewport) {
		if (currentViewport.equals(viewport) === false) {
			gl.viewport(viewport.x, viewport.y, viewport.z, viewport.w);
			currentViewport.copy(viewport);
		}
	}
	function updateUBOMapping(uniformsGroup, program) {
		let mapping = uboProgramMap.get(program);
		if (mapping === void 0) {
			mapping = /* @__PURE__ */ new WeakMap();
			uboProgramMap.set(program, mapping);
		}
		let blockIndex = mapping.get(uniformsGroup);
		if (blockIndex === void 0) {
			blockIndex = gl.getUniformBlockIndex(program, uniformsGroup.name);
			mapping.set(uniformsGroup, blockIndex);
		}
	}
	function uniformBlockBinding(uniformsGroup, program) {
		const blockIndex = uboProgramMap.get(program).get(uniformsGroup);
		if (uboBindings.get(program) !== blockIndex) {
			gl.uniformBlockBinding(program, blockIndex, uniformsGroup.__bindingPointIndex);
			uboBindings.set(program, blockIndex);
		}
	}
	function reset() {
		gl.disable(gl.BLEND);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.ONE, gl.ZERO);
		gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO);
		gl.blendColor(0, 0, 0, 0);
		gl.colorMask(true, true, true, true);
		gl.clearColor(0, 0, 0, 0);
		gl.depthMask(true);
		gl.depthFunc(gl.LESS);
		depthBuffer.setReversed(false);
		gl.clearDepth(1);
		gl.stencilMask(4294967295);
		gl.stencilFunc(gl.ALWAYS, 0, 4294967295);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		gl.clearStencil(0);
		gl.cullFace(gl.BACK);
		gl.frontFace(gl.CCW);
		gl.polygonOffset(0, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.useProgram(null);
		gl.lineWidth(1);
		gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
		gl.pixelStorei(gl.PACK_ROW_LENGTH, 0);
		gl.pixelStorei(gl.PACK_SKIP_PIXELS, 0);
		gl.pixelStorei(gl.PACK_SKIP_ROWS, 0);
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
		gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
		gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
		gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
		gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
		enabledCapabilities = {};
		parameters = {};
		currentTextureSlot = null;
		currentBoundTextures = {};
		currentBoundFramebuffers = {};
		currentDrawbuffers = /* @__PURE__ */ new WeakMap();
		defaultDrawbuffers = [];
		currentProgram = null;
		currentBlendingEnabled = false;
		currentBlending = null;
		currentBlendEquation = null;
		currentBlendSrc = null;
		currentBlendDst = null;
		currentBlendEquationAlpha = null;
		currentBlendSrcAlpha = null;
		currentBlendDstAlpha = null;
		currentBlendColor = new Color(0, 0, 0);
		currentBlendAlpha = 0;
		currentPremultipledAlpha = false;
		currentFlipSided = null;
		currentCullFace = null;
		currentLineWidth = null;
		currentPolygonOffsetFactor = null;
		currentPolygonOffsetUnits = null;
		currentScissor.set(0, 0, gl.canvas.width, gl.canvas.height);
		currentViewport.set(0, 0, gl.canvas.width, gl.canvas.height);
		colorBuffer.reset();
		depthBuffer.reset();
		stencilBuffer.reset();
	}
	return {
		buffers: {
			color: colorBuffer,
			depth: depthBuffer,
			stencil: stencilBuffer
		},
		enable,
		disable,
		bindFramebuffer,
		drawBuffers,
		useProgram,
		setBlending,
		setMaterial,
		setFlipSided,
		setCullFace,
		setLineWidth,
		setPolygonOffset,
		setScissorTest,
		activeTexture,
		bindTexture,
		unbindTexture,
		compressedTexImage2D,
		compressedTexImage3D,
		texImage2D,
		texImage3D,
		pixelStorei,
		getParameter,
		updateUBOMapping,
		uniformBlockBinding,
		texStorage2D,
		texStorage3D,
		texSubImage2D,
		texSubImage3D,
		compressedTexSubImage2D,
		compressedTexSubImage3D,
		scissor,
		viewport,
		reset
	};
}
function WebGLTextures(_gl, extensions, state, properties, capabilities, utils, info) {
	const multisampledRTTExt = extensions.has("WEBGL_multisampled_render_to_texture") ? extensions.get("WEBGL_multisampled_render_to_texture") : null;
	const supportsInvalidateFramebuffer = typeof navigator === "undefined" ? false : /OculusBrowser/g.test(navigator.userAgent);
	const _imageDimensions = new Vector2();
	const _videoTextures = /* @__PURE__ */ new WeakMap();
	const _htmlTextures = /* @__PURE__ */ new Set();
	let _canvas;
	const _sources = /* @__PURE__ */ new WeakMap();
	let useOffscreenCanvas = false;
	try {
		useOffscreenCanvas = typeof OffscreenCanvas !== "undefined" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
	} catch (err) {}
	function createCanvas(width, height) {
		return useOffscreenCanvas ? new OffscreenCanvas(width, height) : createElementNS("canvas");
	}
	function resizeImage(image, needsNewCanvas, maxSize) {
		let scale = 1;
		const dimensions = getDimensions(image);
		if (dimensions.width > maxSize || dimensions.height > maxSize) scale = maxSize / Math.max(dimensions.width, dimensions.height);
		if (scale < 1) {
			if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement || typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement || typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap || typeof VideoFrame !== "undefined" && image instanceof VideoFrame) {
				const width = Math.floor(scale * dimensions.width);
				const height = Math.floor(scale * dimensions.height);
				if (_canvas === void 0) _canvas = createCanvas(width, height);
				const canvas = needsNewCanvas ? createCanvas(width, height) : _canvas;
				canvas.width = width;
				canvas.height = height;
				canvas.getContext("2d").drawImage(image, 0, 0, width, height);
				warn("WebGLRenderer: Texture has been resized from (" + dimensions.width + "x" + dimensions.height + ") to (" + width + "x" + height + ").");
				return canvas;
			} else {
				if ("data" in image) warn("WebGLRenderer: Image in DataTexture is too big (" + dimensions.width + "x" + dimensions.height + ").");
				return image;
			}
		}
		return image;
	}
	function textureNeedsGenerateMipmaps(texture) {
		return texture.generateMipmaps;
	}
	function generateMipmap(target) {
		_gl.generateMipmap(target);
	}
	function getTargetType(texture) {
		if (texture.isWebGLCubeRenderTarget) return _gl.TEXTURE_CUBE_MAP;
		if (texture.isWebGL3DRenderTarget) return _gl.TEXTURE_3D;
		if (texture.isWebGLArrayRenderTarget || texture.isCompressedArrayTexture) return _gl.TEXTURE_2D_ARRAY;
		return _gl.TEXTURE_2D;
	}
	function getInternalFormat(internalFormatName, glFormat, glType, normalized, colorSpace, forceLinearTransfer = false) {
		if (internalFormatName !== null) {
			if (_gl[internalFormatName] !== void 0) return _gl[internalFormatName];
			warn("WebGLRenderer: Attempt to use non-existing WebGL internal format '" + internalFormatName + "'");
		}
		let ext_texture_norm16;
		if (normalized) {
			ext_texture_norm16 = extensions.get("EXT_texture_norm16");
			if (!ext_texture_norm16) warn("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension");
		}
		let internalFormat = glFormat;
		if (glFormat === _gl.RED) {
			if (glType === _gl.FLOAT) internalFormat = _gl.R32F;
			if (glType === _gl.HALF_FLOAT) internalFormat = _gl.R16F;
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.R8;
			if (glType === _gl.UNSIGNED_SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.R16_EXT;
			if (glType === _gl.SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.R16_SNORM_EXT;
		}
		if (glFormat === _gl.RED_INTEGER) {
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.R8UI;
			if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.R16UI;
			if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.R32UI;
			if (glType === _gl.BYTE) internalFormat = _gl.R8I;
			if (glType === _gl.SHORT) internalFormat = _gl.R16I;
			if (glType === _gl.INT) internalFormat = _gl.R32I;
		}
		if (glFormat === _gl.RG) {
			if (glType === _gl.FLOAT) internalFormat = _gl.RG32F;
			if (glType === _gl.HALF_FLOAT) internalFormat = _gl.RG16F;
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RG8;
			if (glType === _gl.UNSIGNED_SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RG16_EXT;
			if (glType === _gl.SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RG16_SNORM_EXT;
		}
		if (glFormat === _gl.RG_INTEGER) {
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RG8UI;
			if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RG16UI;
			if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RG32UI;
			if (glType === _gl.BYTE) internalFormat = _gl.RG8I;
			if (glType === _gl.SHORT) internalFormat = _gl.RG16I;
			if (glType === _gl.INT) internalFormat = _gl.RG32I;
		}
		if (glFormat === _gl.RGB_INTEGER) {
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RGB8UI;
			if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RGB16UI;
			if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RGB32UI;
			if (glType === _gl.BYTE) internalFormat = _gl.RGB8I;
			if (glType === _gl.SHORT) internalFormat = _gl.RGB16I;
			if (glType === _gl.INT) internalFormat = _gl.RGB32I;
		}
		if (glFormat === _gl.RGBA_INTEGER) {
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = _gl.RGBA8UI;
			if (glType === _gl.UNSIGNED_SHORT) internalFormat = _gl.RGBA16UI;
			if (glType === _gl.UNSIGNED_INT) internalFormat = _gl.RGBA32UI;
			if (glType === _gl.BYTE) internalFormat = _gl.RGBA8I;
			if (glType === _gl.SHORT) internalFormat = _gl.RGBA16I;
			if (glType === _gl.INT) internalFormat = _gl.RGBA32I;
		}
		if (glFormat === _gl.RGB) {
			if (glType === _gl.UNSIGNED_SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RGB16_EXT;
			if (glType === _gl.SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RGB16_SNORM_EXT;
			if (glType === _gl.UNSIGNED_INT_5_9_9_9_REV) internalFormat = _gl.RGB9_E5;
			if (glType === _gl.UNSIGNED_INT_10F_11F_11F_REV) internalFormat = _gl.R11F_G11F_B10F;
		}
		if (glFormat === _gl.RGBA) {
			const transfer = forceLinearTransfer ? LinearTransfer : ColorManagement.getTransfer(colorSpace);
			if (glType === _gl.FLOAT) internalFormat = _gl.RGBA32F;
			if (glType === _gl.HALF_FLOAT) internalFormat = _gl.RGBA16F;
			if (glType === _gl.UNSIGNED_BYTE) internalFormat = transfer === "srgb" ? _gl.SRGB8_ALPHA8 : _gl.RGBA8;
			if (glType === _gl.UNSIGNED_SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RGBA16_EXT;
			if (glType === _gl.SHORT && ext_texture_norm16) internalFormat = ext_texture_norm16.RGBA16_SNORM_EXT;
			if (glType === _gl.UNSIGNED_SHORT_4_4_4_4) internalFormat = _gl.RGBA4;
			if (glType === _gl.UNSIGNED_SHORT_5_5_5_1) internalFormat = _gl.RGB5_A1;
		}
		if (internalFormat === _gl.R16F || internalFormat === _gl.R32F || internalFormat === _gl.RG16F || internalFormat === _gl.RG32F || internalFormat === _gl.RGBA16F || internalFormat === _gl.RGBA32F) extensions.get("EXT_color_buffer_float");
		return internalFormat;
	}
	function getInternalDepthFormat(useStencil, depthType) {
		let glInternalFormat;
		if (useStencil) {
			if (depthType === null || depthType === 1014 || depthType === 1020) glInternalFormat = _gl.DEPTH24_STENCIL8;
			else if (depthType === 1015) glInternalFormat = _gl.DEPTH32F_STENCIL8;
			else if (depthType === 1012) {
				glInternalFormat = _gl.DEPTH24_STENCIL8;
				warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.");
			}
		} else if (depthType === null || depthType === 1014 || depthType === 1020) glInternalFormat = _gl.DEPTH_COMPONENT24;
		else if (depthType === 1015) glInternalFormat = _gl.DEPTH_COMPONENT32F;
		else if (depthType === 1012) glInternalFormat = _gl.DEPTH_COMPONENT16;
		return glInternalFormat;
	}
	function getMipLevels(texture, image) {
		if (textureNeedsGenerateMipmaps(texture) === true || texture.isFramebufferTexture && texture.minFilter !== 1003 && texture.minFilter !== 1006) return Math.log2(Math.max(image.width, image.height)) + 1;
		else if (texture.mipmaps !== void 0 && texture.mipmaps.length > 0) return texture.mipmaps.length;
		else if (texture.isCompressedTexture && Array.isArray(texture.image)) return image.mipmaps.length;
		else return 1;
	}
	function onTextureDispose(event) {
		const texture = event.target;
		texture.removeEventListener("dispose", onTextureDispose);
		deallocateTexture(texture);
		if (texture.isVideoTexture) _videoTextures.delete(texture);
		if (texture.isHTMLTexture) _htmlTextures.delete(texture);
	}
	function onRenderTargetDispose(event) {
		const renderTarget = event.target;
		renderTarget.removeEventListener("dispose", onRenderTargetDispose);
		deallocateRenderTarget(renderTarget);
	}
	function deallocateTexture(texture) {
		const textureProperties = properties.get(texture);
		if (textureProperties.__webglInit === void 0) return;
		const source = texture.source;
		const webglTextures = _sources.get(source);
		if (webglTextures) {
			const webglTexture = webglTextures[textureProperties.__cacheKey];
			webglTexture.usedTimes--;
			if (webglTexture.usedTimes === 0) deleteTexture(texture);
			if (Object.keys(webglTextures).length === 0) _sources.delete(source);
		}
		properties.remove(texture);
	}
	function deleteTexture(texture) {
		const textureProperties = properties.get(texture);
		_gl.deleteTexture(textureProperties.__webglTexture);
		const source = texture.source;
		const webglTextures = _sources.get(source);
		delete webglTextures[textureProperties.__cacheKey];
		info.memory.textures--;
	}
	function deallocateRenderTarget(renderTarget) {
		const renderTargetProperties = properties.get(renderTarget);
		if (renderTarget.depthTexture) {
			renderTarget.depthTexture.dispose();
			properties.remove(renderTarget.depthTexture);
		}
		if (renderTarget.isWebGLCubeRenderTarget) for (let i = 0; i < 6; i++) {
			if (Array.isArray(renderTargetProperties.__webglFramebuffer[i])) for (let level = 0; level < renderTargetProperties.__webglFramebuffer[i].length; level++) _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[i][level]);
			else _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[i]);
			if (renderTargetProperties.__webglDepthbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthbuffer[i]);
		}
		else {
			if (Array.isArray(renderTargetProperties.__webglFramebuffer)) for (let level = 0; level < renderTargetProperties.__webglFramebuffer.length; level++) _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer[level]);
			else _gl.deleteFramebuffer(renderTargetProperties.__webglFramebuffer);
			if (renderTargetProperties.__webglDepthbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthbuffer);
			if (renderTargetProperties.__webglMultisampledFramebuffer) _gl.deleteFramebuffer(renderTargetProperties.__webglMultisampledFramebuffer);
			if (renderTargetProperties.__webglColorRenderbuffer) {
				for (let i = 0; i < renderTargetProperties.__webglColorRenderbuffer.length; i++) if (renderTargetProperties.__webglColorRenderbuffer[i]) _gl.deleteRenderbuffer(renderTargetProperties.__webglColorRenderbuffer[i]);
			}
			if (renderTargetProperties.__webglDepthRenderbuffer) _gl.deleteRenderbuffer(renderTargetProperties.__webglDepthRenderbuffer);
		}
		const textures = renderTarget.textures;
		for (let i = 0, il = textures.length; i < il; i++) {
			const attachmentProperties = properties.get(textures[i]);
			if (attachmentProperties.__webglTexture) {
				_gl.deleteTexture(attachmentProperties.__webglTexture);
				info.memory.textures--;
			}
			properties.remove(textures[i]);
		}
		properties.remove(renderTarget);
	}
	let textureUnits = 0;
	function resetTextureUnits() {
		textureUnits = 0;
	}
	function getTextureUnits() {
		return textureUnits;
	}
	function setTextureUnits(value) {
		textureUnits = value;
	}
	function allocateTextureUnit() {
		const textureUnit = textureUnits;
		if (textureUnit >= capabilities.maxTextures) warn("WebGLTextures: Trying to use " + (textureUnit + 1) + " texture units while this GPU supports only " + capabilities.maxTextures);
		textureUnits += 1;
		return textureUnit;
	}
	function getTextureCacheKey(texture) {
		const array = [];
		array.push(texture.wrapS);
		array.push(texture.wrapT);
		array.push(texture.wrapR || 0);
		array.push(texture.magFilter);
		array.push(texture.minFilter);
		array.push(texture.anisotropy);
		array.push(texture.internalFormat);
		array.push(texture.format);
		array.push(texture.type);
		array.push(texture.generateMipmaps);
		array.push(texture.premultiplyAlpha);
		array.push(texture.flipY);
		array.push(texture.unpackAlignment);
		array.push(texture.colorSpace);
		return array.join();
	}
	function setTexture2D(texture, slot) {
		const textureProperties = properties.get(texture);
		if (texture.isVideoTexture) updateVideoTexture(texture);
		if (texture.isRenderTargetTexture === false && texture.isExternalTexture !== true && texture.version > 0 && textureProperties.__version !== texture.version) {
			const image = texture.image;
			if (image === null) warn("WebGLRenderer: Texture marked for update but no image data found.");
			else if (image.complete === false) warn("WebGLRenderer: Texture marked for update but image is incomplete");
			else {
				uploadTexture(textureProperties, texture, slot);
				return;
			}
		} else if (texture.isExternalTexture) textureProperties.__webglTexture = texture.sourceTexture ? texture.sourceTexture : null;
		state.bindTexture(_gl.TEXTURE_2D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
	}
	function setTexture2DArray(texture, slot) {
		const textureProperties = properties.get(texture);
		if (texture.isRenderTargetTexture === false && texture.version > 0 && textureProperties.__version !== texture.version) {
			uploadTexture(textureProperties, texture, slot);
			return;
		} else if (texture.isExternalTexture) textureProperties.__webglTexture = texture.sourceTexture ? texture.sourceTexture : null;
		state.bindTexture(_gl.TEXTURE_2D_ARRAY, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
	}
	function setTexture3D(texture, slot) {
		const textureProperties = properties.get(texture);
		if (texture.isRenderTargetTexture === false && texture.version > 0 && textureProperties.__version !== texture.version) {
			uploadTexture(textureProperties, texture, slot);
			return;
		}
		state.bindTexture(_gl.TEXTURE_3D, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
	}
	function setTextureCube(texture, slot) {
		const textureProperties = properties.get(texture);
		if (texture.isCubeDepthTexture !== true && texture.version > 0 && textureProperties.__version !== texture.version) {
			uploadCubeTexture(textureProperties, texture, slot);
			return;
		}
		state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
	}
	const wrappingToGL = {
		[RepeatWrapping]: _gl.REPEAT,
		[ClampToEdgeWrapping]: _gl.CLAMP_TO_EDGE,
		[MirroredRepeatWrapping]: _gl.MIRRORED_REPEAT
	};
	const filterToGL = {
		[NearestFilter]: _gl.NEAREST,
		[NearestMipmapNearestFilter]: _gl.NEAREST_MIPMAP_NEAREST,
		[NearestMipmapLinearFilter]: _gl.NEAREST_MIPMAP_LINEAR,
		[LinearFilter]: _gl.LINEAR,
		[LinearMipmapNearestFilter]: _gl.LINEAR_MIPMAP_NEAREST,
		[LinearMipmapLinearFilter]: _gl.LINEAR_MIPMAP_LINEAR
	};
	const compareToGL = {
		[512]: _gl.NEVER,
		[519]: _gl.ALWAYS,
		[513]: _gl.LESS,
		[515]: _gl.LEQUAL,
		[514]: _gl.EQUAL,
		[518]: _gl.GEQUAL,
		[516]: _gl.GREATER,
		[517]: _gl.NOTEQUAL
	};
	function setTextureParameters(textureType, texture) {
		if (texture.type === 1015 && extensions.has("OES_texture_float_linear") === false && (texture.magFilter === 1006 || texture.magFilter === 1007 || texture.magFilter === 1005 || texture.magFilter === 1008 || texture.minFilter === 1006 || texture.minFilter === 1007 || texture.minFilter === 1005 || texture.minFilter === 1008)) warn("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");
		_gl.texParameteri(textureType, _gl.TEXTURE_WRAP_S, wrappingToGL[texture.wrapS]);
		_gl.texParameteri(textureType, _gl.TEXTURE_WRAP_T, wrappingToGL[texture.wrapT]);
		if (textureType === _gl.TEXTURE_3D || textureType === _gl.TEXTURE_2D_ARRAY) _gl.texParameteri(textureType, _gl.TEXTURE_WRAP_R, wrappingToGL[texture.wrapR]);
		_gl.texParameteri(textureType, _gl.TEXTURE_MAG_FILTER, filterToGL[texture.magFilter]);
		_gl.texParameteri(textureType, _gl.TEXTURE_MIN_FILTER, filterToGL[texture.minFilter]);
		if (texture.compareFunction) {
			_gl.texParameteri(textureType, _gl.TEXTURE_COMPARE_MODE, _gl.COMPARE_REF_TO_TEXTURE);
			_gl.texParameteri(textureType, _gl.TEXTURE_COMPARE_FUNC, compareToGL[texture.compareFunction]);
		}
		if (extensions.has("EXT_texture_filter_anisotropic") === true) {
			if (texture.magFilter === 1003) return;
			if (texture.minFilter !== 1005 && texture.minFilter !== 1008) return;
			if (texture.type === 1015 && extensions.has("OES_texture_float_linear") === false) return;
			if (texture.anisotropy > 1 || properties.get(texture).__currentAnisotropy) {
				const extension = extensions.get("EXT_texture_filter_anisotropic");
				_gl.texParameterf(textureType, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(texture.anisotropy, capabilities.getMaxAnisotropy()));
				properties.get(texture).__currentAnisotropy = texture.anisotropy;
			}
		}
	}
	function initTexture(textureProperties, texture) {
		let forceUpload = false;
		if (textureProperties.__webglInit === void 0) {
			textureProperties.__webglInit = true;
			texture.addEventListener("dispose", onTextureDispose);
		}
		const source = texture.source;
		let webglTextures = _sources.get(source);
		if (webglTextures === void 0) {
			webglTextures = {};
			_sources.set(source, webglTextures);
		}
		const textureCacheKey = getTextureCacheKey(texture);
		if (textureCacheKey !== textureProperties.__cacheKey) {
			if (webglTextures[textureCacheKey] === void 0) {
				webglTextures[textureCacheKey] = {
					texture: _gl.createTexture(),
					usedTimes: 0
				};
				info.memory.textures++;
				forceUpload = true;
			}
			webglTextures[textureCacheKey].usedTimes++;
			const webglTexture = webglTextures[textureProperties.__cacheKey];
			if (webglTexture !== void 0) {
				webglTextures[textureProperties.__cacheKey].usedTimes--;
				if (webglTexture.usedTimes === 0) deleteTexture(texture);
			}
			textureProperties.__cacheKey = textureCacheKey;
			textureProperties.__webglTexture = webglTextures[textureCacheKey].texture;
		}
		return forceUpload;
	}
	function getRow(index, rowLength, componentStride) {
		return Math.floor(Math.floor(index / componentStride) / rowLength);
	}
	function updateTexture(texture, image, glFormat, glType) {
		const componentStride = 4;
		const updateRanges = texture.updateRanges;
		if (updateRanges.length === 0) state.texSubImage2D(_gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, glFormat, glType, image.data);
		else {
			updateRanges.sort((a, b) => a.start - b.start);
			let mergeIndex = 0;
			for (let i = 1; i < updateRanges.length; i++) {
				const previousRange = updateRanges[mergeIndex];
				const range = updateRanges[i];
				const previousEnd = previousRange.start + previousRange.count;
				const currentRow = getRow(range.start, image.width, componentStride);
				const previousRow = getRow(previousRange.start, image.width, componentStride);
				if (range.start <= previousEnd + 1 && currentRow === previousRow && getRow(range.start + range.count - 1, image.width, componentStride) === currentRow) previousRange.count = Math.max(previousRange.count, range.start + range.count - previousRange.start);
				else {
					++mergeIndex;
					updateRanges[mergeIndex] = range;
				}
			}
			updateRanges.length = mergeIndex + 1;
			const currentUnpackRowLen = state.getParameter(_gl.UNPACK_ROW_LENGTH);
			const currentUnpackSkipPixels = state.getParameter(_gl.UNPACK_SKIP_PIXELS);
			const currentUnpackSkipRows = state.getParameter(_gl.UNPACK_SKIP_ROWS);
			state.pixelStorei(_gl.UNPACK_ROW_LENGTH, image.width);
			for (let i = 0, l = updateRanges.length; i < l; i++) {
				const range = updateRanges[i];
				const pixelStart = Math.floor(range.start / componentStride);
				const pixelCount = Math.ceil(range.count / componentStride);
				const x = pixelStart % image.width;
				const y = Math.floor(pixelStart / image.width);
				const width = pixelCount;
				const height = 1;
				state.pixelStorei(_gl.UNPACK_SKIP_PIXELS, x);
				state.pixelStorei(_gl.UNPACK_SKIP_ROWS, y);
				state.texSubImage2D(_gl.TEXTURE_2D, 0, x, y, width, height, glFormat, glType, image.data);
			}
			texture.clearUpdateRanges();
			state.pixelStorei(_gl.UNPACK_ROW_LENGTH, currentUnpackRowLen);
			state.pixelStorei(_gl.UNPACK_SKIP_PIXELS, currentUnpackSkipPixels);
			state.pixelStorei(_gl.UNPACK_SKIP_ROWS, currentUnpackSkipRows);
		}
	}
	function uploadTexture(textureProperties, texture, slot) {
		let textureType = _gl.TEXTURE_2D;
		if (texture.isDataArrayTexture || texture.isCompressedArrayTexture) textureType = _gl.TEXTURE_2D_ARRAY;
		if (texture.isData3DTexture) textureType = _gl.TEXTURE_3D;
		const forceUpload = initTexture(textureProperties, texture);
		const source = texture.source;
		state.bindTexture(textureType, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
		const sourceProperties = properties.get(source);
		if (source.version !== sourceProperties.__version || forceUpload === true) {
			state.activeTexture(_gl.TEXTURE0 + slot);
			if ((typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) === false) {
				const workingPrimaries = ColorManagement.getPrimaries(ColorManagement.workingColorSpace);
				const texturePrimaries = texture.colorSpace === "" ? null : ColorManagement.getPrimaries(texture.colorSpace);
				const unpackConversion = texture.colorSpace === "" || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;
				state.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
				state.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
				state.pixelStorei(_gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion);
			}
			state.pixelStorei(_gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
			let image = resizeImage(texture.image, false, capabilities.maxTextureSize);
			image = verifyColorSpace(texture, image);
			const glFormat = utils.convert(texture.format, texture.colorSpace);
			const glType = utils.convert(texture.type);
			let glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.normalized, texture.colorSpace, texture.isVideoTexture);
			setTextureParameters(textureType, texture);
			let mipmap;
			const mipmaps = texture.mipmaps;
			const useTexStorage = texture.isVideoTexture !== true;
			const allocateMemory = sourceProperties.__version === void 0 || forceUpload === true;
			const dataReady = source.dataReady;
			const levels = getMipLevels(texture, image);
			if (texture.isDepthTexture) {
				glInternalFormat = getInternalDepthFormat(texture.format === DepthStencilFormat, texture.type);
				if (allocateMemory) {
					if (useTexStorage) state.texStorage2D(_gl.TEXTURE_2D, 1, glInternalFormat, image.width, image.height);
					else state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, null);
				}
			} else if (texture.isDataTexture) {
				if (mipmaps.length > 0) {
					if (useTexStorage && allocateMemory) state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height);
					for (let i = 0, il = mipmaps.length; i < il; i++) {
						mipmap = mipmaps[i];
						if (useTexStorage) {
							if (dataReady) state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
						} else state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
					}
					texture.generateMipmaps = false;
				} else if (useTexStorage) {
					if (allocateMemory) state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height);
					if (dataReady) updateTexture(texture, image, glFormat, glType);
				} else state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, image.width, image.height, 0, glFormat, glType, image.data);
			} else if (texture.isCompressedTexture) {
				if (texture.isCompressedArrayTexture) {
					if (useTexStorage && allocateMemory) state.texStorage3D(_gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height, image.depth);
					for (let i = 0, il = mipmaps.length; i < il; i++) {
						mipmap = mipmaps[i];
						if (texture.format !== 1023) {
							if (glFormat !== null) {
								if (useTexStorage) {
									if (dataReady) {
										if (texture.layerUpdates.size > 0) {
											const layerByteLength = getByteLength(mipmap.width, mipmap.height, texture.format, texture.type);
											for (const layerIndex of texture.layerUpdates) {
												const layerData = mipmap.data.subarray(layerIndex * layerByteLength / mipmap.data.BYTES_PER_ELEMENT, (layerIndex + 1) * layerByteLength / mipmap.data.BYTES_PER_ELEMENT);
												state.compressedTexSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, layerIndex, mipmap.width, mipmap.height, 1, glFormat, layerData);
											}
										} else state.compressedTexSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, mipmap.data);
									}
								} else state.compressedTexImage3D(_gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, mipmap.data, 0, 0);
							} else warn("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
						} else if (useTexStorage) {
							if (dataReady) state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, i, 0, 0, 0, mipmap.width, mipmap.height, image.depth, glFormat, glType, mipmap.data);
						} else state.texImage3D(_gl.TEXTURE_2D_ARRAY, i, glInternalFormat, mipmap.width, mipmap.height, image.depth, 0, glFormat, glType, mipmap.data);
					}
					if (texture.layerUpdates.size > 0) texture.clearLayerUpdates();
				} else {
					if (useTexStorage && allocateMemory) state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height);
					for (let i = 0, il = mipmaps.length; i < il; i++) {
						mipmap = mipmaps[i];
						if (texture.format !== 1023) {
							if (glFormat !== null) {
								if (useTexStorage) {
									if (dataReady) state.compressedTexSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
								} else state.compressedTexImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data);
							} else warn("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
						} else if (useTexStorage) {
							if (dataReady) state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
						} else state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
					}
				}
			} else if (texture.isDataArrayTexture) {
				if (useTexStorage) {
					if (allocateMemory) state.texStorage3D(_gl.TEXTURE_2D_ARRAY, levels, glInternalFormat, image.width, image.height, image.depth);
					if (dataReady) {
						if (texture.layerUpdates.size > 0) {
							const layerByteLength = getByteLength(image.width, image.height, texture.format, texture.type);
							for (const layerIndex of texture.layerUpdates) {
								const layerData = image.data.subarray(layerIndex * layerByteLength / image.data.BYTES_PER_ELEMENT, (layerIndex + 1) * layerByteLength / image.data.BYTES_PER_ELEMENT);
								state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, 0, 0, 0, layerIndex, image.width, image.height, 1, glFormat, glType, layerData);
							}
							texture.clearLayerUpdates();
						} else state.texSubImage3D(_gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
					}
				} else state.texImage3D(_gl.TEXTURE_2D_ARRAY, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data);
			} else if (texture.isData3DTexture) {
				if (useTexStorage) {
					if (allocateMemory) state.texStorage3D(_gl.TEXTURE_3D, levels, glInternalFormat, image.width, image.height, image.depth);
					if (dataReady) state.texSubImage3D(_gl.TEXTURE_3D, 0, 0, 0, 0, image.width, image.height, image.depth, glFormat, glType, image.data);
				} else state.texImage3D(_gl.TEXTURE_3D, 0, glInternalFormat, image.width, image.height, image.depth, 0, glFormat, glType, image.data);
			} else if (texture.isFramebufferTexture) {
				if (allocateMemory) {
					if (useTexStorage) state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, image.width, image.height);
					else {
						let width = image.width, height = image.height;
						for (let i = 0; i < levels; i++) {
							state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, width, height, 0, glFormat, glType, null);
							width >>= 1;
							height >>= 1;
						}
					}
				}
			} else if (texture.isHTMLTexture) {
				if ("texElementImage2D" in _gl) {
					const canvas = _gl.canvas;
					if (!canvas.hasAttribute("layoutsubtree")) canvas.setAttribute("layoutsubtree", "true");
					if (image.parentNode !== canvas) {
						canvas.appendChild(image);
						_htmlTextures.add(texture);
						canvas.onpaint = (event) => {
							const changed = event.changedElements;
							for (const t of _htmlTextures) if (changed.includes(t.image)) t.needsUpdate = true;
						};
						canvas.requestPaint();
						return;
					}
					if (_gl.texElementImage2D.length === 3) _gl.texElementImage2D(_gl.TEXTURE_2D, _gl.RGBA8, image);
					else {
						const level = 0;
						const internalFormat = _gl.RGBA;
						const srcFormat = _gl.RGBA;
						const srcType = _gl.UNSIGNED_BYTE;
						_gl.texElementImage2D(_gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
					}
					_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
					_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
					_gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
				}
			} else if (mipmaps.length > 0) {
				if (useTexStorage && allocateMemory) {
					const dimensions = getDimensions(mipmaps[0]);
					state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, dimensions.width, dimensions.height);
				}
				for (let i = 0, il = mipmaps.length; i < il; i++) {
					mipmap = mipmaps[i];
					if (useTexStorage) {
						if (dataReady) state.texSubImage2D(_gl.TEXTURE_2D, i, 0, 0, glFormat, glType, mipmap);
					} else state.texImage2D(_gl.TEXTURE_2D, i, glInternalFormat, glFormat, glType, mipmap);
				}
				texture.generateMipmaps = false;
			} else if (useTexStorage) {
				if (allocateMemory) {
					const dimensions = getDimensions(image);
					state.texStorage2D(_gl.TEXTURE_2D, levels, glInternalFormat, dimensions.width, dimensions.height);
				}
				if (dataReady) state.texSubImage2D(_gl.TEXTURE_2D, 0, 0, 0, glFormat, glType, image);
			} else state.texImage2D(_gl.TEXTURE_2D, 0, glInternalFormat, glFormat, glType, image);
			if (textureNeedsGenerateMipmaps(texture)) generateMipmap(textureType);
			sourceProperties.__version = source.version;
			if (texture.onUpdate) texture.onUpdate(texture);
		}
		textureProperties.__version = texture.version;
	}
	function uploadCubeTexture(textureProperties, texture, slot) {
		if (texture.image.length !== 6) return;
		const forceUpload = initTexture(textureProperties, texture);
		const source = texture.source;
		state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture, _gl.TEXTURE0 + slot);
		const sourceProperties = properties.get(source);
		if (source.version !== sourceProperties.__version || forceUpload === true) {
			state.activeTexture(_gl.TEXTURE0 + slot);
			const workingPrimaries = ColorManagement.getPrimaries(ColorManagement.workingColorSpace);
			const texturePrimaries = texture.colorSpace === "" ? null : ColorManagement.getPrimaries(texture.colorSpace);
			const unpackConversion = texture.colorSpace === "" || workingPrimaries === texturePrimaries ? _gl.NONE : _gl.BROWSER_DEFAULT_WEBGL;
			state.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
			state.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
			state.pixelStorei(_gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
			state.pixelStorei(_gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpackConversion);
			const isCompressed = texture.isCompressedTexture || texture.image[0].isCompressedTexture;
			const isDataTexture = texture.image[0] && texture.image[0].isDataTexture;
			const cubeImage = [];
			for (let i = 0; i < 6; i++) {
				if (!isCompressed && !isDataTexture) cubeImage[i] = resizeImage(texture.image[i], true, capabilities.maxCubemapSize);
				else cubeImage[i] = isDataTexture ? texture.image[i].image : texture.image[i];
				cubeImage[i] = verifyColorSpace(texture, cubeImage[i]);
			}
			const image = cubeImage[0], glFormat = utils.convert(texture.format, texture.colorSpace), glType = utils.convert(texture.type), glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.normalized, texture.colorSpace);
			const useTexStorage = texture.isVideoTexture !== true;
			const allocateMemory = sourceProperties.__version === void 0 || forceUpload === true;
			const dataReady = source.dataReady;
			let levels = getMipLevels(texture, image);
			setTextureParameters(_gl.TEXTURE_CUBE_MAP, texture);
			let mipmaps;
			if (isCompressed) {
				if (useTexStorage && allocateMemory) state.texStorage2D(_gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, image.width, image.height);
				for (let i = 0; i < 6; i++) {
					mipmaps = cubeImage[i].mipmaps;
					for (let j = 0; j < mipmaps.length; j++) {
						const mipmap = mipmaps[j];
						if (texture.format !== 1023) {
							if (glFormat !== null) {
								if (useTexStorage) {
									if (dataReady) state.compressedTexSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
								} else state.compressedTexImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, mipmap.data);
							} else warn("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");
						} else if (useTexStorage) {
							if (dataReady) state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
						} else state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j, glInternalFormat, mipmap.width, mipmap.height, 0, glFormat, glType, mipmap.data);
					}
				}
			} else {
				mipmaps = texture.mipmaps;
				if (useTexStorage && allocateMemory) {
					if (mipmaps.length > 0) levels++;
					const dimensions = getDimensions(cubeImage[0]);
					state.texStorage2D(_gl.TEXTURE_CUBE_MAP, levels, glInternalFormat, dimensions.width, dimensions.height);
				}
				for (let i = 0; i < 6; i++) if (isDataTexture) {
					if (useTexStorage) {
						if (dataReady) state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, cubeImage[i].width, cubeImage[i].height, glFormat, glType, cubeImage[i].data);
					} else state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, cubeImage[i].width, cubeImage[i].height, 0, glFormat, glType, cubeImage[i].data);
					for (let j = 0; j < mipmaps.length; j++) {
						const mipmapImage = mipmaps[j].image[i].image;
						if (useTexStorage) {
							if (dataReady) state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, mipmapImage.width, mipmapImage.height, glFormat, glType, mipmapImage.data);
						} else state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, mipmapImage.width, mipmapImage.height, 0, glFormat, glType, mipmapImage.data);
					}
				} else {
					if (useTexStorage) {
						if (dataReady) state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, 0, 0, glFormat, glType, cubeImage[i]);
					} else state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, glFormat, glType, cubeImage[i]);
					for (let j = 0; j < mipmaps.length; j++) {
						const mipmap = mipmaps[j];
						if (useTexStorage) {
							if (dataReady) state.texSubImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, 0, 0, glFormat, glType, mipmap.image[i]);
						} else state.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, j + 1, glInternalFormat, glFormat, glType, mipmap.image[i]);
					}
				}
			}
			if (textureNeedsGenerateMipmaps(texture)) generateMipmap(_gl.TEXTURE_CUBE_MAP);
			sourceProperties.__version = source.version;
			if (texture.onUpdate) texture.onUpdate(texture);
		}
		textureProperties.__version = texture.version;
	}
	function setupFrameBufferTexture(framebuffer, renderTarget, texture, attachment, textureTarget, level) {
		const glFormat = utils.convert(texture.format, texture.colorSpace);
		const glType = utils.convert(texture.type);
		const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.normalized, texture.colorSpace);
		const renderTargetProperties = properties.get(renderTarget);
		const textureProperties = properties.get(texture);
		textureProperties.__renderTarget = renderTarget;
		if (!renderTargetProperties.__hasExternalTextures) {
			const width = Math.max(1, renderTarget.width >> level);
			const height = Math.max(1, renderTarget.height >> level);
			if (textureTarget === _gl.TEXTURE_3D || textureTarget === _gl.TEXTURE_2D_ARRAY) state.texImage3D(textureTarget, level, glInternalFormat, width, height, renderTarget.depth, 0, glFormat, glType, null);
			else state.texImage2D(textureTarget, level, glInternalFormat, width, height, 0, glFormat, glType, null);
		}
		state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
		if (useMultisampledRTT(renderTarget)) multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, attachment, textureTarget, textureProperties.__webglTexture, 0, getRenderTargetSamples(renderTarget));
		else if (textureTarget === _gl.TEXTURE_2D || textureTarget >= _gl.TEXTURE_CUBE_MAP_POSITIVE_X && textureTarget <= _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z) _gl.framebufferTexture2D(_gl.FRAMEBUFFER, attachment, textureTarget, textureProperties.__webglTexture, level);
		state.bindFramebuffer(_gl.FRAMEBUFFER, null);
	}
	function setupRenderBufferStorage(renderbuffer, renderTarget, useMultisample) {
		_gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
		if (renderTarget.depthBuffer) {
			const depthTexture = renderTarget.depthTexture;
			const depthType = depthTexture && depthTexture.isDepthTexture ? depthTexture.type : null;
			const glInternalFormat = getInternalDepthFormat(renderTarget.stencilBuffer, depthType);
			const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
			if (useMultisampledRTT(renderTarget)) multisampledRTTExt.renderbufferStorageMultisampleEXT(_gl.RENDERBUFFER, getRenderTargetSamples(renderTarget), glInternalFormat, renderTarget.width, renderTarget.height);
			else if (useMultisample) _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, getRenderTargetSamples(renderTarget), glInternalFormat, renderTarget.width, renderTarget.height);
			else _gl.renderbufferStorage(_gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height);
			_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
		} else {
			const textures = renderTarget.textures;
			for (let i = 0; i < textures.length; i++) {
				const texture = textures[i];
				const glFormat = utils.convert(texture.format, texture.colorSpace);
				const glType = utils.convert(texture.type);
				const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.normalized, texture.colorSpace);
				if (useMultisampledRTT(renderTarget)) multisampledRTTExt.renderbufferStorageMultisampleEXT(_gl.RENDERBUFFER, getRenderTargetSamples(renderTarget), glInternalFormat, renderTarget.width, renderTarget.height);
				else if (useMultisample) _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, getRenderTargetSamples(renderTarget), glInternalFormat, renderTarget.width, renderTarget.height);
				else _gl.renderbufferStorage(_gl.RENDERBUFFER, glInternalFormat, renderTarget.width, renderTarget.height);
			}
		}
		_gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
	}
	function setupDepthTexture(framebuffer, renderTarget, cubeFace) {
		const isCube = renderTarget.isWebGLCubeRenderTarget === true;
		state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
		if (!(renderTarget.depthTexture && renderTarget.depthTexture.isDepthTexture)) throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");
		const textureProperties = properties.get(renderTarget.depthTexture);
		textureProperties.__renderTarget = renderTarget;
		if (!textureProperties.__webglTexture || renderTarget.depthTexture.image.width !== renderTarget.width || renderTarget.depthTexture.image.height !== renderTarget.height) {
			renderTarget.depthTexture.image.width = renderTarget.width;
			renderTarget.depthTexture.image.height = renderTarget.height;
			renderTarget.depthTexture.needsUpdate = true;
		}
		if (isCube) {
			if (textureProperties.__webglInit === void 0) {
				textureProperties.__webglInit = true;
				renderTarget.depthTexture.addEventListener("dispose", onTextureDispose);
			}
			if (textureProperties.__webglTexture === void 0) {
				textureProperties.__webglTexture = _gl.createTexture();
				state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture);
				setTextureParameters(_gl.TEXTURE_CUBE_MAP, renderTarget.depthTexture);
				const glFormat = utils.convert(renderTarget.depthTexture.format);
				const glType = utils.convert(renderTarget.depthTexture.type);
				let glInternalFormat;
				if (renderTarget.depthTexture.format === 1026) glInternalFormat = _gl.DEPTH_COMPONENT24;
				else if (renderTarget.depthTexture.format === 1027) glInternalFormat = _gl.DEPTH24_STENCIL8;
				for (let i = 0; i < 6; i++) _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glInternalFormat, renderTarget.width, renderTarget.height, 0, glFormat, glType, null);
			}
		} else setTexture2D(renderTarget.depthTexture, 0);
		const webglDepthTexture = textureProperties.__webglTexture;
		const samples = getRenderTargetSamples(renderTarget);
		const glTextureType = isCube ? _gl.TEXTURE_CUBE_MAP_POSITIVE_X + cubeFace : _gl.TEXTURE_2D;
		const glAttachmentType = renderTarget.depthTexture.format === 1027 ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
		if (renderTarget.depthTexture.format === 1026) {
			if (useMultisampledRTT(renderTarget)) multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, glAttachmentType, glTextureType, webglDepthTexture, 0, samples);
			else _gl.framebufferTexture2D(_gl.FRAMEBUFFER, glAttachmentType, glTextureType, webglDepthTexture, 0);
		} else if (renderTarget.depthTexture.format === 1027) {
			if (useMultisampledRTT(renderTarget)) multisampledRTTExt.framebufferTexture2DMultisampleEXT(_gl.FRAMEBUFFER, glAttachmentType, glTextureType, webglDepthTexture, 0, samples);
			else _gl.framebufferTexture2D(_gl.FRAMEBUFFER, glAttachmentType, glTextureType, webglDepthTexture, 0);
		} else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.");
	}
	function setupDepthRenderbuffer(renderTarget) {
		const renderTargetProperties = properties.get(renderTarget);
		const isCube = renderTarget.isWebGLCubeRenderTarget === true;
		if (renderTargetProperties.__boundDepthTexture !== renderTarget.depthTexture) {
			const depthTexture = renderTarget.depthTexture;
			if (renderTargetProperties.__depthDisposeCallback) renderTargetProperties.__depthDisposeCallback();
			if (depthTexture) {
				const disposeEvent = () => {
					delete renderTargetProperties.__boundDepthTexture;
					delete renderTargetProperties.__depthDisposeCallback;
					depthTexture.removeEventListener("dispose", disposeEvent);
				};
				depthTexture.addEventListener("dispose", disposeEvent);
				renderTargetProperties.__depthDisposeCallback = disposeEvent;
			}
			renderTargetProperties.__boundDepthTexture = depthTexture;
		}
		if (renderTarget.depthTexture && !renderTargetProperties.__autoAllocateDepthBuffer) {
			if (isCube) for (let i = 0; i < 6; i++) setupDepthTexture(renderTargetProperties.__webglFramebuffer[i], renderTarget, i);
			else {
				const mipmaps = renderTarget.texture.mipmaps;
				if (mipmaps && mipmaps.length > 0) setupDepthTexture(renderTargetProperties.__webglFramebuffer[0], renderTarget, 0);
				else setupDepthTexture(renderTargetProperties.__webglFramebuffer, renderTarget, 0);
			}
		} else if (isCube) {
			renderTargetProperties.__webglDepthbuffer = [];
			for (let i = 0; i < 6; i++) {
				state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[i]);
				if (renderTargetProperties.__webglDepthbuffer[i] === void 0) {
					renderTargetProperties.__webglDepthbuffer[i] = _gl.createRenderbuffer();
					setupRenderBufferStorage(renderTargetProperties.__webglDepthbuffer[i], renderTarget, false);
				} else {
					const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
					const renderbuffer = renderTargetProperties.__webglDepthbuffer[i];
					_gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
					_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
				}
			}
		} else {
			const mipmaps = renderTarget.texture.mipmaps;
			if (mipmaps && mipmaps.length > 0) state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[0]);
			else state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
			if (renderTargetProperties.__webglDepthbuffer === void 0) {
				renderTargetProperties.__webglDepthbuffer = _gl.createRenderbuffer();
				setupRenderBufferStorage(renderTargetProperties.__webglDepthbuffer, renderTarget, false);
			} else {
				const glAttachmentType = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
				const renderbuffer = renderTargetProperties.__webglDepthbuffer;
				_gl.bindRenderbuffer(_gl.RENDERBUFFER, renderbuffer);
				_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, glAttachmentType, _gl.RENDERBUFFER, renderbuffer);
			}
		}
		state.bindFramebuffer(_gl.FRAMEBUFFER, null);
	}
	function rebindTextures(renderTarget, colorTexture, depthTexture) {
		const renderTargetProperties = properties.get(renderTarget);
		if (colorTexture !== void 0) setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, renderTarget.texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, 0);
		if (depthTexture !== void 0) setupDepthRenderbuffer(renderTarget);
	}
	function setupRenderTarget(renderTarget) {
		const texture = renderTarget.texture;
		const renderTargetProperties = properties.get(renderTarget);
		const textureProperties = properties.get(texture);
		renderTarget.addEventListener("dispose", onRenderTargetDispose);
		const textures = renderTarget.textures;
		const isCube = renderTarget.isWebGLCubeRenderTarget === true;
		const isMultipleRenderTargets = textures.length > 1;
		if (!isMultipleRenderTargets) {
			if (textureProperties.__webglTexture === void 0) textureProperties.__webglTexture = _gl.createTexture();
			textureProperties.__version = texture.version;
			info.memory.textures++;
		}
		if (isCube) {
			renderTargetProperties.__webglFramebuffer = [];
			for (let i = 0; i < 6; i++) if (texture.mipmaps && texture.mipmaps.length > 0) {
				renderTargetProperties.__webglFramebuffer[i] = [];
				for (let level = 0; level < texture.mipmaps.length; level++) renderTargetProperties.__webglFramebuffer[i][level] = _gl.createFramebuffer();
			} else renderTargetProperties.__webglFramebuffer[i] = _gl.createFramebuffer();
		} else {
			if (texture.mipmaps && texture.mipmaps.length > 0) {
				renderTargetProperties.__webglFramebuffer = [];
				for (let level = 0; level < texture.mipmaps.length; level++) renderTargetProperties.__webglFramebuffer[level] = _gl.createFramebuffer();
			} else renderTargetProperties.__webglFramebuffer = _gl.createFramebuffer();
			if (isMultipleRenderTargets) for (let i = 0, il = textures.length; i < il; i++) {
				const attachmentProperties = properties.get(textures[i]);
				if (attachmentProperties.__webglTexture === void 0) {
					attachmentProperties.__webglTexture = _gl.createTexture();
					info.memory.textures++;
				}
			}
			if (renderTarget.samples > 0 && useMultisampledRTT(renderTarget) === false) {
				renderTargetProperties.__webglMultisampledFramebuffer = _gl.createFramebuffer();
				renderTargetProperties.__webglColorRenderbuffer = [];
				state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
				for (let i = 0; i < textures.length; i++) {
					const texture = textures[i];
					renderTargetProperties.__webglColorRenderbuffer[i] = _gl.createRenderbuffer();
					_gl.bindRenderbuffer(_gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);
					const glFormat = utils.convert(texture.format, texture.colorSpace);
					const glType = utils.convert(texture.type);
					const glInternalFormat = getInternalFormat(texture.internalFormat, glFormat, glType, texture.normalized, texture.colorSpace, renderTarget.isXRRenderTarget === true);
					const samples = getRenderTargetSamples(renderTarget);
					_gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, samples, glInternalFormat, renderTarget.width, renderTarget.height);
					_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);
				}
				_gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
				if (renderTarget.depthBuffer) {
					renderTargetProperties.__webglDepthRenderbuffer = _gl.createRenderbuffer();
					setupRenderBufferStorage(renderTargetProperties.__webglDepthRenderbuffer, renderTarget, true);
				}
				state.bindFramebuffer(_gl.FRAMEBUFFER, null);
			}
		}
		if (isCube) {
			state.bindTexture(_gl.TEXTURE_CUBE_MAP, textureProperties.__webglTexture);
			setTextureParameters(_gl.TEXTURE_CUBE_MAP, texture);
			for (let i = 0; i < 6; i++) if (texture.mipmaps && texture.mipmaps.length > 0) for (let level = 0; level < texture.mipmaps.length; level++) setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[i][level], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level);
			else setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[i], renderTarget, texture, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0);
			if (textureNeedsGenerateMipmaps(texture)) generateMipmap(_gl.TEXTURE_CUBE_MAP);
			state.unbindTexture();
		} else if (isMultipleRenderTargets) {
			for (let i = 0, il = textures.length; i < il; i++) {
				const attachment = textures[i];
				const attachmentProperties = properties.get(attachment);
				let glTextureType = _gl.TEXTURE_2D;
				if (renderTarget.isWebGL3DRenderTarget || renderTarget.isWebGLArrayRenderTarget) glTextureType = renderTarget.isWebGL3DRenderTarget ? _gl.TEXTURE_3D : _gl.TEXTURE_2D_ARRAY;
				state.bindTexture(glTextureType, attachmentProperties.__webglTexture);
				setTextureParameters(glTextureType, attachment);
				setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, attachment, _gl.COLOR_ATTACHMENT0 + i, glTextureType, 0);
				if (textureNeedsGenerateMipmaps(attachment)) generateMipmap(glTextureType);
			}
			state.unbindTexture();
		} else {
			let glTextureType = _gl.TEXTURE_2D;
			if (renderTarget.isWebGL3DRenderTarget || renderTarget.isWebGLArrayRenderTarget) glTextureType = renderTarget.isWebGL3DRenderTarget ? _gl.TEXTURE_3D : _gl.TEXTURE_2D_ARRAY;
			state.bindTexture(glTextureType, textureProperties.__webglTexture);
			setTextureParameters(glTextureType, texture);
			if (texture.mipmaps && texture.mipmaps.length > 0) for (let level = 0; level < texture.mipmaps.length; level++) setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer[level], renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, level);
			else setupFrameBufferTexture(renderTargetProperties.__webglFramebuffer, renderTarget, texture, _gl.COLOR_ATTACHMENT0, glTextureType, 0);
			if (textureNeedsGenerateMipmaps(texture)) generateMipmap(glTextureType);
			state.unbindTexture();
		}
		if (renderTarget.depthBuffer) setupDepthRenderbuffer(renderTarget);
	}
	function updateRenderTargetMipmap(renderTarget) {
		const textures = renderTarget.textures;
		for (let i = 0, il = textures.length; i < il; i++) {
			const texture = textures[i];
			if (textureNeedsGenerateMipmaps(texture)) {
				const targetType = getTargetType(renderTarget);
				const webglTexture = properties.get(texture).__webglTexture;
				state.bindTexture(targetType, webglTexture);
				generateMipmap(targetType);
				state.unbindTexture();
			}
		}
	}
	const invalidationArrayRead = [];
	const invalidationArrayDraw = [];
	function updateMultisampleRenderTarget(renderTarget) {
		if (renderTarget.samples > 0) {
			if (useMultisampledRTT(renderTarget) === false) {
				const textures = renderTarget.textures;
				const width = renderTarget.width;
				const height = renderTarget.height;
				let mask = _gl.COLOR_BUFFER_BIT;
				const depthStyle = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
				const renderTargetProperties = properties.get(renderTarget);
				const isMultipleRenderTargets = textures.length > 1;
				if (isMultipleRenderTargets) for (let i = 0; i < textures.length; i++) {
					state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
					_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, null);
					state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
					_gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, null, 0);
				}
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
				const mipmaps = renderTarget.texture.mipmaps;
				if (mipmaps && mipmaps.length > 0) state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglFramebuffer[0]);
				else state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
				for (let i = 0; i < textures.length; i++) {
					if (renderTarget.resolveDepthBuffer) {
						if (renderTarget.depthBuffer) mask |= _gl.DEPTH_BUFFER_BIT;
						if (renderTarget.stencilBuffer && renderTarget.resolveStencilBuffer) mask |= _gl.STENCIL_BUFFER_BIT;
					}
					if (isMultipleRenderTargets) {
						_gl.framebufferRenderbuffer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);
						const webglTexture = properties.get(textures[i]).__webglTexture;
						_gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, webglTexture, 0);
					}
					_gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, mask, _gl.NEAREST);
					if (supportsInvalidateFramebuffer === true) {
						invalidationArrayRead.length = 0;
						invalidationArrayDraw.length = 0;
						invalidationArrayRead.push(_gl.COLOR_ATTACHMENT0 + i);
						if (renderTarget.depthBuffer && renderTarget.storeMultisampledDepthBuffer === false) {
							invalidationArrayRead.push(depthStyle);
							invalidationArrayDraw.push(depthStyle);
							_gl.invalidateFramebuffer(_gl.DRAW_FRAMEBUFFER, invalidationArrayDraw);
						}
						_gl.invalidateFramebuffer(_gl.READ_FRAMEBUFFER, invalidationArrayRead);
					}
				}
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);
				if (isMultipleRenderTargets) for (let i = 0; i < textures.length; i++) {
					state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
					_gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.RENDERBUFFER, renderTargetProperties.__webglColorRenderbuffer[i]);
					const webglTexture = properties.get(textures[i]).__webglTexture;
					state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
					_gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, _gl.TEXTURE_2D, webglTexture, 0);
				}
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, renderTargetProperties.__webglMultisampledFramebuffer);
			} else if (renderTarget.depthBuffer && renderTarget.storeMultisampledDepthBuffer === false && supportsInvalidateFramebuffer) {
				const depthStyle = renderTarget.stencilBuffer ? _gl.DEPTH_STENCIL_ATTACHMENT : _gl.DEPTH_ATTACHMENT;
				_gl.invalidateFramebuffer(_gl.DRAW_FRAMEBUFFER, [depthStyle]);
			}
		}
	}
	function getRenderTargetSamples(renderTarget) {
		return Math.min(capabilities.maxSamples, renderTarget.samples);
	}
	function useMultisampledRTT(renderTarget) {
		const renderTargetProperties = properties.get(renderTarget);
		return renderTarget.samples > 0 && extensions.has("WEBGL_multisampled_render_to_texture") === true && renderTargetProperties.__useRenderToTexture !== false;
	}
	function updateVideoTexture(texture) {
		const frame = info.render.frame;
		if (_videoTextures.get(texture) !== frame) {
			_videoTextures.set(texture, frame);
			texture.update();
		}
	}
	function verifyColorSpace(texture, image) {
		const colorSpace = texture.colorSpace;
		const format = texture.format;
		const type = texture.type;
		if (texture.isCompressedTexture === true || texture.isVideoTexture === true) return image;
		if (colorSpace !== "srgb-linear" && colorSpace !== "") {
			if (ColorManagement.getTransfer(colorSpace) === "srgb") {
				if (format !== 1023 || type !== 1009) warn("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.");
			} else error("WebGLTextures: Unsupported texture color space:", colorSpace);
		}
		return image;
	}
	function getDimensions(image) {
		if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
			_imageDimensions.width = image.naturalWidth || image.width;
			_imageDimensions.height = image.naturalHeight || image.height;
		} else if (typeof VideoFrame !== "undefined" && image instanceof VideoFrame) {
			_imageDimensions.width = image.displayWidth;
			_imageDimensions.height = image.displayHeight;
		} else {
			_imageDimensions.width = image.width;
			_imageDimensions.height = image.height;
		}
		return _imageDimensions;
	}
	this.allocateTextureUnit = allocateTextureUnit;
	this.resetTextureUnits = resetTextureUnits;
	this.getTextureUnits = getTextureUnits;
	this.setTextureUnits = setTextureUnits;
	this.setTexture2D = setTexture2D;
	this.setTexture2DArray = setTexture2DArray;
	this.setTexture3D = setTexture3D;
	this.setTextureCube = setTextureCube;
	this.rebindTextures = rebindTextures;
	this.setupRenderTarget = setupRenderTarget;
	this.updateRenderTargetMipmap = updateRenderTargetMipmap;
	this.updateMultisampleRenderTarget = updateMultisampleRenderTarget;
	this.setupDepthRenderbuffer = setupDepthRenderbuffer;
	this.setupFrameBufferTexture = setupFrameBufferTexture;
	this.useMultisampledRTT = useMultisampledRTT;
	this.isReversedDepthBuffer = function() {
		return state.buffers.depth.getReversed();
	};
}
function WebGLUtils(gl, extensions) {
	function convert(p, colorSpace = "") {
		let extension;
		const transfer = ColorManagement.getTransfer(colorSpace);
		if (p === 1009) return gl.UNSIGNED_BYTE;
		if (p === 1017) return gl.UNSIGNED_SHORT_4_4_4_4;
		if (p === 1018) return gl.UNSIGNED_SHORT_5_5_5_1;
		if (p === 35902) return gl.UNSIGNED_INT_5_9_9_9_REV;
		if (p === 35899) return gl.UNSIGNED_INT_10F_11F_11F_REV;
		if (p === 1010) return gl.BYTE;
		if (p === 1011) return gl.SHORT;
		if (p === 1012) return gl.UNSIGNED_SHORT;
		if (p === 1013) return gl.INT;
		if (p === 1014) return gl.UNSIGNED_INT;
		if (p === 1015) return gl.FLOAT;
		if (p === 1016) return gl.HALF_FLOAT;
		if (p === 1021) return gl.ALPHA;
		if (p === 1022) return gl.RGB;
		if (p === 1023) return gl.RGBA;
		if (p === 1026) return gl.DEPTH_COMPONENT;
		if (p === 1027) return gl.DEPTH_STENCIL;
		if (p === 1028) return gl.RED;
		if (p === 1029) return gl.RED_INTEGER;
		if (p === 1030) return gl.RG;
		if (p === 1031) return gl.RG_INTEGER;
		if (p === 1033) return gl.RGBA_INTEGER;
		if (p === 33776 || p === 33777 || p === 33778 || p === 33779) {
			if (transfer === "srgb") {
				extension = extensions.get("WEBGL_compressed_texture_s3tc_srgb");
				if (extension !== null) {
					if (p === 33776) return extension.COMPRESSED_SRGB_S3TC_DXT1_EXT;
					if (p === 33777) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
					if (p === 33778) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
					if (p === 33779) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
				} else return null;
			} else {
				extension = extensions.get("WEBGL_compressed_texture_s3tc");
				if (extension !== null) {
					if (p === 33776) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
					if (p === 33777) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
					if (p === 33778) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
					if (p === 33779) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;
				} else return null;
			}
		}
		if (p === 35840 || p === 35841 || p === 35842 || p === 35843) {
			extension = extensions.get("WEBGL_compressed_texture_pvrtc");
			if (extension !== null) {
				if (p === 35840) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
				if (p === 35841) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
				if (p === 35842) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
				if (p === 35843) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
			} else return null;
		}
		if (p === 36196 || p === 37492 || p === 37496 || p === 37488 || p === 37489 || p === 37490 || p === 37491) {
			extension = extensions.get("WEBGL_compressed_texture_etc");
			if (extension !== null) {
				if (p === 36196 || p === 37492) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ETC2 : extension.COMPRESSED_RGB8_ETC2;
				if (p === 37496) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : extension.COMPRESSED_RGBA8_ETC2_EAC;
				if (p === 37488) return extension.COMPRESSED_R11_EAC;
				if (p === 37489) return extension.COMPRESSED_SIGNED_R11_EAC;
				if (p === 37490) return extension.COMPRESSED_RG11_EAC;
				if (p === 37491) return extension.COMPRESSED_SIGNED_RG11_EAC;
			} else return null;
		}
		if (p === 37808 || p === 37809 || p === 37810 || p === 37811 || p === 37812 || p === 37813 || p === 37814 || p === 37815 || p === 37816 || p === 37817 || p === 37818 || p === 37819 || p === 37820 || p === 37821) {
			extension = extensions.get("WEBGL_compressed_texture_astc");
			if (extension !== null) {
				if (p === 37808) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : extension.COMPRESSED_RGBA_ASTC_4x4_KHR;
				if (p === 37809) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : extension.COMPRESSED_RGBA_ASTC_5x4_KHR;
				if (p === 37810) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : extension.COMPRESSED_RGBA_ASTC_5x5_KHR;
				if (p === 37811) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : extension.COMPRESSED_RGBA_ASTC_6x5_KHR;
				if (p === 37812) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : extension.COMPRESSED_RGBA_ASTC_6x6_KHR;
				if (p === 37813) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : extension.COMPRESSED_RGBA_ASTC_8x5_KHR;
				if (p === 37814) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : extension.COMPRESSED_RGBA_ASTC_8x6_KHR;
				if (p === 37815) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : extension.COMPRESSED_RGBA_ASTC_8x8_KHR;
				if (p === 37816) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : extension.COMPRESSED_RGBA_ASTC_10x5_KHR;
				if (p === 37817) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : extension.COMPRESSED_RGBA_ASTC_10x6_KHR;
				if (p === 37818) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : extension.COMPRESSED_RGBA_ASTC_10x8_KHR;
				if (p === 37819) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : extension.COMPRESSED_RGBA_ASTC_10x10_KHR;
				if (p === 37820) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : extension.COMPRESSED_RGBA_ASTC_12x10_KHR;
				if (p === 37821) return transfer === "srgb" ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : extension.COMPRESSED_RGBA_ASTC_12x12_KHR;
			} else return null;
		}
		if (p === 36492 || p === 36494 || p === 36495) {
			extension = extensions.get("EXT_texture_compression_bptc");
			if (extension !== null) {
				if (p === 36492) return transfer === "srgb" ? extension.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : extension.COMPRESSED_RGBA_BPTC_UNORM_EXT;
				if (p === 36494) return extension.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
				if (p === 36495) return extension.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
			} else return null;
		}
		if (p === 36283 || p === 36284 || p === 36285 || p === 36286) {
			extension = extensions.get("EXT_texture_compression_rgtc");
			if (extension !== null) {
				if (p === 36283) return extension.COMPRESSED_RED_RGTC1_EXT;
				if (p === 36284) return extension.COMPRESSED_SIGNED_RED_RGTC1_EXT;
				if (p === 36285) return extension.COMPRESSED_RED_GREEN_RGTC2_EXT;
				if (p === 36286) return extension.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
			} else return null;
		}
		if (p === 1020) return gl.UNSIGNED_INT_24_8;
		return gl[p] !== void 0 ? gl[p] : null;
	}
	return { convert };
}
var _occlusion_vertex = `
void main() {

	gl_Position = vec4( position, 1.0 );

}`;
var _occlusion_fragment = `
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;
/**
* A XR module that manages the access to the Depth Sensing API.
*/
var WebXRDepthSensing = class {
	/**
	* Constructs a new depth sensing module.
	*/
	constructor() {
		/**
		* An opaque texture representing the depth of the user's environment.
		*
		* @type {?ExternalTexture}
		*/
		this.texture = null;
		/**
		* A plane mesh for visualizing the depth texture.
		*
		* @type {?Mesh}
		*/
		this.mesh = null;
		/**
		* The depth near value.
		*
		* @type {number}
		*/
		this.depthNear = 0;
		/**
		* The depth near far.
		*
		* @type {number}
		*/
		this.depthFar = 0;
	}
	/**
	* Inits the depth sensing module
	*
	* @param {XRWebGLDepthInformation} depthData - The XR depth data.
	* @param {XRRenderState} renderState - The XR render state.
	*/
	init(depthData, renderState) {
		if (this.texture === null) {
			const texture = new ExternalTexture(depthData.texture);
			if (depthData.depthNear !== renderState.depthNear || depthData.depthFar !== renderState.depthFar) {
				this.depthNear = depthData.depthNear;
				this.depthFar = depthData.depthFar;
			}
			this.texture = texture;
		}
	}
	/**
	* Returns a plane mesh that visualizes the depth texture.
	*
	* @param {ArrayCamera} cameraXR - The XR camera.
	* @return {?Mesh} The plane mesh.
	*/
	getMesh(cameraXR) {
		if (this.texture !== null) {
			if (this.mesh === null) {
				const viewport = cameraXR.cameras[0].viewport;
				const material = new ShaderMaterial({
					vertexShader: _occlusion_vertex,
					fragmentShader: _occlusion_fragment,
					uniforms: {
						depthColor: { value: this.texture },
						depthWidth: { value: viewport.z },
						depthHeight: { value: viewport.w }
					}
				});
				this.mesh = new Mesh(new PlaneGeometry(20, 20), material);
			}
		}
		return this.mesh;
	}
	/**
	* Resets the module
	*/
	reset() {
		this.texture = null;
		this.mesh = null;
	}
	/**
	* Returns a texture representing the depth of the user's environment.
	*
	* @return {?ExternalTexture} The depth texture.
	*/
	getDepthTexture() {
		return this.texture;
	}
};
/**
* This class represents an abstraction of the WebXR Device API and is
* internally used by {@link WebGLRenderer}. `WebXRManager` also provides a public
* interface that allows users to enable/disable XR and perform XR related
* tasks like for instance retrieving controllers.
*
* @augments EventDispatcher
* @hideconstructor
*/
var WebXRManager = class extends EventDispatcher {
	/**
	* Constructs a new WebGL renderer.
	*
	* @param {WebGLRenderer} renderer - The renderer.
	* @param {WebGL2RenderingContext} gl - The rendering context.
	*/
	constructor(renderer, gl) {
		super();
		const scope = this;
		let session = null;
		let framebufferScaleFactor = 1;
		let referenceSpace = null;
		let referenceSpaceType = "local-floor";
		let foveation = 1;
		let customReferenceSpace = null;
		let pose = null;
		let glBinding = null;
		let glProjLayer = null;
		let glBaseLayer = null;
		let xrFrame = null;
		const supportsGlBinding = typeof XRWebGLBinding !== "undefined";
		const depthSensing = new WebXRDepthSensing();
		const cameraAccessTextures = {};
		const attributes = gl.getContextAttributes();
		let initialRenderTarget = null;
		let newRenderTarget = null;
		const controllers = [];
		const controllerInputSources = [];
		const currentSize = new Vector2();
		let currentPixelRatio = null;
		let currentCameraSettings = null;
		const cameraL = new PerspectiveCamera();
		cameraL.viewport = new Vector4();
		const cameraR = new PerspectiveCamera();
		cameraR.viewport = new Vector4();
		const cameras = [cameraL, cameraR];
		const cameraXR = new ArrayCamera();
		let _currentDepthNear = null;
		let _currentDepthFar = null;
		/**
		* Whether the manager's XR camera should be automatically updated or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.cameraAutoUpdate = true;
		/**
		* This flag notifies the renderer to be ready for XR rendering. Set it to `true`
		* if you are going to use XR in your app.
		*
		* @type {boolean}
		* @default false
		*/
		this.enabled = false;
		/**
		* Whether XR presentation is active or not.
		*
		* @type {boolean}
		* @readonly
		* @default false
		*/
		this.isPresenting = false;
		/**
		* Returns a group representing the `target ray` space of the XR controller.
		* Use this space for visualizing 3D objects that support the user in pointing
		* tasks like UI interaction.
		*
		* @param {number} index - The index of the controller.
		* @return {Group} A group representing the `target ray` space.
		*/
		this.getController = function(index) {
			let controller = controllers[index];
			if (controller === void 0) {
				controller = new WebXRController();
				controllers[index] = controller;
			}
			return controller.getTargetRaySpace();
		};
		/**
		* Returns a group representing the `grip` space of the XR controller.
		* Use this space for visualizing 3D objects that support the user in pointing
		* tasks like UI interaction.
		*
		* Note: If you want to show something in the user's hand AND offer a
		* pointing ray at the same time, you'll want to attached the handheld object
		* to the group returned by `getControllerGrip()` and the ray to the
		* group returned by `getController()`. The idea is to have two
		* different groups in two different coordinate spaces for the same WebXR
		* controller.
		*
		* @param {number} index - The index of the controller.
		* @return {Group} A group representing the `grip` space.
		*/
		this.getControllerGrip = function(index) {
			let controller = controllers[index];
			if (controller === void 0) {
				controller = new WebXRController();
				controllers[index] = controller;
			}
			return controller.getGripSpace();
		};
		/**
		* Returns a group representing the `hand` space of the XR controller.
		* Use this space for visualizing 3D objects that support the user in pointing
		* tasks like UI interaction.
		*
		* @param {number} index - The index of the controller.
		* @return {Group} A group representing the `hand` space.
		*/
		this.getHand = function(index) {
			let controller = controllers[index];
			if (controller === void 0) {
				controller = new WebXRController();
				controllers[index] = controller;
			}
			return controller.getHandSpace();
		};
		function onSessionEvent(event) {
			const controllerIndex = controllerInputSources.indexOf(event.inputSource);
			if (controllerIndex === -1) return;
			const controller = controllers[controllerIndex];
			if (controller !== void 0) {
				controller.update(event.inputSource, event.frame, customReferenceSpace || referenceSpace);
				controller.dispatchEvent({
					type: event.type,
					data: event.inputSource
				});
			}
		}
		function onSessionEnd() {
			session.removeEventListener("select", onSessionEvent);
			session.removeEventListener("selectstart", onSessionEvent);
			session.removeEventListener("selectend", onSessionEvent);
			session.removeEventListener("squeeze", onSessionEvent);
			session.removeEventListener("squeezestart", onSessionEvent);
			session.removeEventListener("squeezeend", onSessionEvent);
			session.removeEventListener("end", onSessionEnd);
			session.removeEventListener("inputsourceschange", onInputSourcesChange);
			for (let i = 0; i < controllers.length; i++) {
				const inputSource = controllerInputSources[i];
				if (inputSource === null) continue;
				controllerInputSources[i] = null;
				controllers[i].disconnect(inputSource);
			}
			_currentDepthNear = null;
			_currentDepthFar = null;
			depthSensing.reset();
			for (const key in cameraAccessTextures) delete cameraAccessTextures[key];
			renderer.setRenderTarget(initialRenderTarget);
			glBaseLayer = null;
			glProjLayer = null;
			glBinding = null;
			session = null;
			newRenderTarget = null;
			animation.stop();
			scope.isPresenting = false;
			renderer.setPixelRatio(currentPixelRatio);
			renderer.setSize(currentSize.width, currentSize.height, false);
			if (currentCameraSettings !== null) {
				const camera = currentCameraSettings.camera;
				camera.fov = currentCameraSettings.fov;
				camera.zoom = currentCameraSettings.zoom;
				camera.updateProjectionMatrix();
				currentCameraSettings = null;
			}
			scope.dispatchEvent({ type: "sessionend" });
		}
		/**
		* Sets the framebuffer scale factor.
		*
		* This method can not be used during a XR session.
		*
		* @param {number} value - The framebuffer scale factor.
		*/
		this.setFramebufferScaleFactor = function(value) {
			framebufferScaleFactor = value;
			if (scope.isPresenting === true) warn("WebXRManager: Cannot change framebuffer scale while presenting.");
		};
		/**
		* Sets the reference space type. Can be used to configure a spatial relationship with the user's physical
		* environment. Depending on how the user moves in 3D space, setting an appropriate reference space can
		* improve tracking. Default is `local-floor`. Valid values can be found here
		* https://developer.mozilla.org/en-US/docs/Web/API/XRReferenceSpace#reference_space_types.
		*
		* This method can not be used during a XR session.
		*
		* @param {string} value - The reference space type.
		*/
		this.setReferenceSpaceType = function(value) {
			referenceSpaceType = value;
			if (scope.isPresenting === true) warn("WebXRManager: Cannot change reference space type while presenting.");
		};
		/**
		* Returns the XR reference space.
		*
		* @return {XRReferenceSpace} The XR reference space.
		*/
		this.getReferenceSpace = function() {
			return customReferenceSpace || referenceSpace;
		};
		/**
		* Sets a custom XR reference space.
		*
		* @param {XRReferenceSpace} space - The XR reference space.
		*/
		this.setReferenceSpace = function(space) {
			customReferenceSpace = space;
		};
		/**
		* Returns the current base layer.
		*
		* This is an `XRProjectionLayer` when the targeted XR device supports the
		* WebXR Layers API, or an `XRWebGLLayer` otherwise.
		*
		* @return {?(XRWebGLLayer|XRProjectionLayer)} The XR base layer.
		*/
		this.getBaseLayer = function() {
			return glProjLayer !== null ? glProjLayer : glBaseLayer;
		};
		/**
		* Returns the current XR binding.
		*
		* Creates a new binding if needed and the browser is
		* capable of doing so.
		*
		* @return {?XRWebGLBinding} The XR binding. Returns `null` if one cannot be created.
		*/
		this.getBinding = function() {
			if (glBinding === null && supportsGlBinding) glBinding = new XRWebGLBinding(session, gl);
			return glBinding;
		};
		/**
		* Returns the current XR frame.
		*
		* @return {?XRFrame} The XR frame. Returns `null` when used outside a XR session.
		*/
		this.getFrame = function() {
			return xrFrame;
		};
		/**
		* Returns the current XR session.
		*
		* @return {?XRSession} The XR session. Returns `null` when used outside a XR session.
		*/
		this.getSession = function() {
			return session;
		};
		/**
		* After a XR session has been requested usually with one of the `*Button` modules, it
		* is injected into the renderer with this method. This method triggers the start of
		* the actual XR rendering.
		*
		* @async
		* @param {XRSession} value - The XR session to set.
		* @return {Promise} A Promise that resolves when the session has been set.
		*/
		this.setSession = async function(value) {
			session = value;
			if (session !== null) {
				initialRenderTarget = renderer.getRenderTarget();
				session.addEventListener("select", onSessionEvent);
				session.addEventListener("selectstart", onSessionEvent);
				session.addEventListener("selectend", onSessionEvent);
				session.addEventListener("squeeze", onSessionEvent);
				session.addEventListener("squeezestart", onSessionEvent);
				session.addEventListener("squeezeend", onSessionEvent);
				session.addEventListener("end", onSessionEnd);
				session.addEventListener("inputsourceschange", onInputSourcesChange);
				if (attributes.xrCompatible !== true) await gl.makeXRCompatible();
				currentPixelRatio = renderer.getPixelRatio();
				renderer.getSize(currentSize);
				if (!(supportsGlBinding && "createProjectionLayer" in XRWebGLBinding.prototype)) {
					const layerInit = {
						antialias: attributes.antialias,
						alpha: true,
						depth: attributes.depth,
						stencil: attributes.stencil,
						framebufferScaleFactor
					};
					glBaseLayer = new XRWebGLLayer(session, gl, layerInit);
					session.updateRenderState({ baseLayer: glBaseLayer });
					renderer.setPixelRatio(1);
					renderer.setSize(glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight, false);
					newRenderTarget = new WebGLRenderTarget(glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight, {
						format: RGBAFormat,
						type: UnsignedByteType,
						colorSpace: renderer.outputColorSpace,
						stencilBuffer: attributes.stencil,
						resolveDepthBuffer: glBaseLayer.ignoreDepthValues === false,
						resolveStencilBuffer: glBaseLayer.ignoreDepthValues === false,
						storeMultisampledDepthBuffer: glBaseLayer.ignoreDepthValues === false,
						storeMultisampledStencilBuffer: glBaseLayer.ignoreDepthValues === false
					});
				} else {
					let depthFormat = null;
					let depthType = null;
					let glDepthFormat = null;
					if (attributes.depth) {
						glDepthFormat = attributes.stencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;
						depthFormat = attributes.stencil ? DepthStencilFormat : DepthFormat;
						depthType = attributes.stencil ? UnsignedInt248Type : UnsignedIntType;
					}
					const projectionlayerInit = {
						colorFormat: gl.RGBA8,
						depthFormat: glDepthFormat,
						scaleFactor: framebufferScaleFactor
					};
					glBinding = this.getBinding();
					glProjLayer = glBinding.createProjectionLayer(projectionlayerInit);
					session.updateRenderState({ layers: [glProjLayer] });
					renderer.setPixelRatio(1);
					renderer.setSize(glProjLayer.textureWidth, glProjLayer.textureHeight, false);
					newRenderTarget = new WebGLRenderTarget(glProjLayer.textureWidth, glProjLayer.textureHeight, {
						format: RGBAFormat,
						type: UnsignedByteType,
						depthTexture: new DepthTexture(glProjLayer.textureWidth, glProjLayer.textureHeight, depthType, void 0, void 0, void 0, void 0, void 0, void 0, depthFormat),
						stencilBuffer: attributes.stencil,
						colorSpace: renderer.outputColorSpace,
						samples: attributes.antialias ? 4 : 0,
						resolveDepthBuffer: glProjLayer.ignoreDepthValues === false,
						resolveStencilBuffer: glProjLayer.ignoreDepthValues === false,
						storeMultisampledDepthBuffer: glProjLayer.ignoreDepthValues === false,
						storeMultisampledStencilBuffer: glProjLayer.ignoreDepthValues === false
					});
				}
				newRenderTarget.isXRRenderTarget = true;
				this.setFoveation(foveation);
				customReferenceSpace = null;
				referenceSpace = await session.requestReferenceSpace(referenceSpaceType);
				animation.setContext(session);
				animation.start();
				scope.isPresenting = true;
				scope.dispatchEvent({ type: "sessionstart" });
			}
		};
		/**
		* Returns the environment blend mode from the current XR session.
		*
		* @return {'opaque'|'additive'|'alpha-blend'|undefined} The environment blend mode. Returns `undefined` when used outside of a XR session.
		*/
		this.getEnvironmentBlendMode = function() {
			if (session !== null) return session.environmentBlendMode;
		};
		/**
		* Returns the current depth texture computed via depth sensing.
		*
		* See {@link WebXRDepthSensing#getDepthTexture}.
		*
		* @return {?Texture} The depth texture.
		*/
		this.getDepthTexture = function() {
			return depthSensing.getDepthTexture();
		};
		function onInputSourcesChange(event) {
			for (let i = 0; i < event.removed.length; i++) {
				const inputSource = event.removed[i];
				const index = controllerInputSources.indexOf(inputSource);
				if (index >= 0) {
					controllerInputSources[index] = null;
					controllers[index].disconnect(inputSource);
				}
			}
			for (let i = 0; i < event.added.length; i++) {
				const inputSource = event.added[i];
				let controllerIndex = controllerInputSources.indexOf(inputSource);
				if (controllerIndex === -1) {
					for (let i = 0; i < controllers.length; i++) if (i >= controllerInputSources.length) {
						controllerInputSources.push(inputSource);
						controllerIndex = i;
						break;
					} else if (controllerInputSources[i] === null) {
						controllerInputSources[i] = inputSource;
						controllerIndex = i;
						break;
					}
					if (controllerIndex === -1) break;
				}
				const controller = controllers[controllerIndex];
				if (controller) controller.connect(inputSource);
			}
		}
		const cameraLPos = new Vector3();
		const cameraRPos = new Vector3();
		/**
		* Assumes 2 cameras that are parallel and share an X-axis, and that
		* the cameras' projection and world matrices have already been set.
		* And that near and far planes are identical for both cameras.
		* Visualization of this technique: https://computergraphics.stackexchange.com/a/4765
		*
		* @param {ArrayCamera} camera - The camera to update.
		* @param {PerspectiveCamera} cameraL - The left camera.
		* @param {PerspectiveCamera} cameraR - The right camera.
		*/
		function setProjectionFromUnion(camera, cameraL, cameraR) {
			cameraLPos.setFromMatrixPosition(cameraL.matrixWorld);
			cameraRPos.setFromMatrixPosition(cameraR.matrixWorld);
			const ipd = cameraLPos.distanceTo(cameraRPos);
			const projL = cameraL.projectionMatrix.elements;
			const projR = cameraR.projectionMatrix.elements;
			const near = projL[14] / (projL[10] - 1);
			const far = projL[14] / (projL[10] + 1);
			const topFov = (projL[9] + 1) / projL[5];
			const bottomFov = (projL[9] - 1) / projL[5];
			const leftFov = (projL[8] - 1) / projL[0];
			const rightFov = (projR[8] + 1) / projR[0];
			const left = near * leftFov;
			const right = near * rightFov;
			const zOffset = ipd / (-leftFov + rightFov);
			const xOffset = zOffset * -leftFov;
			cameraL.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
			camera.translateX(xOffset);
			camera.translateZ(zOffset);
			camera.matrixWorld.compose(camera.position, camera.quaternion, camera.scale);
			camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
			if (projL[10] === -1) {
				camera.projectionMatrix.copy(cameraL.projectionMatrix);
				camera.projectionMatrixInverse.copy(cameraL.projectionMatrixInverse);
			} else {
				const near2 = near + zOffset;
				const far2 = far + zOffset;
				const left2 = left - xOffset;
				const right2 = right + (ipd - xOffset);
				const top2 = topFov * far / far2 * near2;
				const bottom2 = bottomFov * far / far2 * near2;
				camera.projectionMatrix.makePerspective(left2, right2, top2, bottom2, near2, far2);
				camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
			}
		}
		function updateCamera(camera, parent) {
			if (parent === null) camera.matrixWorld.copy(camera.matrix);
			else camera.matrixWorld.multiplyMatrices(parent.matrixWorld, camera.matrix);
			camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
		}
		/**
		* Updates the state of the XR camera. Use this method on app level if you
		* set `cameraAutoUpdate` to `false`. The method requires the non-XR
		* camera of the scene as a parameter. The passed in camera's transformation
		* is automatically adjusted to the position of the XR camera when calling
		* this method.
		*
		* @param {Camera} camera - The camera.
		*/
		this.updateCamera = function(camera) {
			if (session === null) return;
			let depthNear = camera.near;
			let depthFar = camera.far;
			if (depthSensing.texture !== null) {
				if (depthSensing.depthNear > 0) depthNear = depthSensing.depthNear;
				if (depthSensing.depthFar > 0) depthFar = depthSensing.depthFar;
			}
			cameraXR.near = cameraR.near = cameraL.near = depthNear;
			cameraXR.far = cameraR.far = cameraL.far = depthFar;
			if (_currentDepthNear !== cameraXR.near || _currentDepthFar !== cameraXR.far) {
				session.updateRenderState({
					depthNear: cameraXR.near,
					depthFar: cameraXR.far
				});
				_currentDepthNear = cameraXR.near;
				_currentDepthFar = cameraXR.far;
			}
			cameraXR.layers.mask = camera.layers.mask | 6;
			cameraL.layers.mask = cameraXR.layers.mask & -5;
			cameraR.layers.mask = cameraXR.layers.mask & -3;
			const parent = camera.parent;
			const cameras = cameraXR.cameras;
			updateCamera(cameraXR, parent);
			for (let i = 0; i < cameras.length; i++) updateCamera(cameras[i], parent);
			if (cameras.length === 2) setProjectionFromUnion(cameraXR, cameraL, cameraR);
			else cameraXR.projectionMatrix.copy(cameraL.projectionMatrix);
			if (currentCameraSettings === null && camera.isPerspectiveCamera) currentCameraSettings = {
				camera,
				fov: camera.fov,
				zoom: camera.zoom
			};
			updateUserCamera(camera, cameraXR, parent);
		};
		function updateUserCamera(camera, cameraXR, parent) {
			if (parent === null) camera.matrix.copy(cameraXR.matrixWorld);
			else {
				camera.matrix.copy(parent.matrixWorld);
				camera.matrix.invert();
				camera.matrix.multiply(cameraXR.matrixWorld);
			}
			camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
			camera.updateMatrixWorld(true);
			camera.projectionMatrix.copy(cameraXR.projectionMatrix);
			camera.projectionMatrixInverse.copy(cameraXR.projectionMatrixInverse);
			if (camera.isPerspectiveCamera) {
				camera.fov = RAD2DEG * 2 * Math.atan(1 / camera.projectionMatrix.elements[5]);
				camera.zoom = 1;
			}
		}
		/**
		* Returns an instance of {@link ArrayCamera} which represents the XR camera
		* of the active XR session. For each view it holds a separate camera object.
		*
		* The camera's `fov` is currently not used and does not reflect the fov of
		* the XR camera. If you need the fov on app level, you have to compute in
		* manually from the XR camera's projection matrices.
		*
		* @return {ArrayCamera} The XR camera.
		*/
		this.getCamera = function() {
			return cameraXR;
		};
		/**
		* Returns the amount of foveation used by the XR compositor for the projection layer.
		*
		* @return {number|undefined} The amount of foveation.
		*/
		this.getFoveation = function() {
			if (glProjLayer === null && glBaseLayer === null) return;
			return foveation;
		};
		/**
		* Sets the foveation value.
		*
		* @param {number} value - A number in the range `[0,1]` where `0` means no foveation (full resolution)
		* and `1` means maximum foveation (the edges render at lower resolution).
		*/
		this.setFoveation = function(value) {
			foveation = value;
			if (glProjLayer !== null) glProjLayer.fixedFoveation = value;
			if (glBaseLayer !== null && glBaseLayer.fixedFoveation !== void 0) glBaseLayer.fixedFoveation = value;
		};
		/**
		* Returns `true` if depth sensing is supported.
		*
		* @return {boolean} Whether depth sensing is supported or not.
		*/
		this.hasDepthSensing = function() {
			return depthSensing.texture !== null;
		};
		/**
		* Returns the depth sensing mesh.
		*
		* See {@link WebXRDepthSensing#getMesh}.
		*
		* @return {Mesh} The depth sensing mesh.
		*/
		this.getDepthSensingMesh = function() {
			return depthSensing.getMesh(cameraXR);
		};
		/**
		* Retrieves an opaque texture from the view-aligned {@link XRCamera}.
		* Only available during the current animation loop.
		*
		* @param {XRCamera} xrCamera - The camera to query.
		* @return {?Texture} An opaque texture representing the current raw camera frame.
		*/
		this.getCameraTexture = function(xrCamera) {
			return cameraAccessTextures[xrCamera];
		};
		let onAnimationFrameCallback = null;
		function onAnimationFrame(time, frame) {
			pose = frame.getViewerPose(customReferenceSpace || referenceSpace);
			xrFrame = frame;
			if (pose !== null) {
				const views = pose.views;
				if (glBaseLayer !== null) {
					renderer.setRenderTargetFramebuffer(newRenderTarget, glBaseLayer.framebuffer);
					renderer.setRenderTarget(newRenderTarget);
				}
				let cameraXRNeedsUpdate = false;
				if (views.length !== cameraXR.cameras.length) {
					cameraXR.cameras.length = 0;
					cameraXRNeedsUpdate = true;
				}
				for (let i = 0; i < views.length; i++) {
					const view = views[i];
					let viewport = null;
					if (glBaseLayer !== null) viewport = glBaseLayer.getViewport(view);
					else {
						const glSubImage = glBinding.getViewSubImage(glProjLayer, view);
						viewport = glSubImage.viewport;
						if (i === 0) {
							renderer.setRenderTargetTextures(newRenderTarget, glSubImage.colorTexture, glSubImage.depthStencilTexture);
							renderer.setRenderTarget(newRenderTarget);
						}
					}
					let camera = cameras[i];
					if (camera === void 0) {
						camera = new PerspectiveCamera();
						camera.layers.enable(i);
						camera.viewport = new Vector4();
						cameras[i] = camera;
					}
					camera.matrix.fromArray(view.transform.matrix);
					camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
					camera.projectionMatrix.fromArray(view.projectionMatrix);
					camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
					camera.viewport.set(viewport.x, viewport.y, viewport.width, viewport.height);
					if (i === 0) {
						cameraXR.matrix.copy(camera.matrix);
						cameraXR.matrix.decompose(cameraXR.position, cameraXR.quaternion, cameraXR.scale);
					}
					if (cameraXRNeedsUpdate === true) cameraXR.cameras.push(camera);
				}
				const enabledFeatures = session.enabledFeatures;
				if (enabledFeatures && enabledFeatures.includes("depth-sensing") && session.depthUsage == "gpu-optimized" && supportsGlBinding) {
					glBinding = scope.getBinding();
					const depthData = glBinding.getDepthInformation(views[0]);
					if (depthData && depthData.isValid && depthData.texture) depthSensing.init(depthData, session.renderState);
				}
				if (enabledFeatures && enabledFeatures.includes("camera-access") && supportsGlBinding) {
					renderer.state.unbindTexture();
					glBinding = scope.getBinding();
					for (let i = 0; i < views.length; i++) {
						const camera = views[i].camera;
						if (camera) {
							let cameraTex = cameraAccessTextures[camera];
							if (!cameraTex) {
								cameraTex = new ExternalTexture();
								cameraAccessTextures[camera] = cameraTex;
							}
							const glTexture = glBinding.getCameraImage(camera);
							cameraTex.sourceTexture = glTexture;
						}
					}
				}
			}
			for (let i = 0; i < controllers.length; i++) {
				const inputSource = controllerInputSources[i];
				const controller = controllers[i];
				if (inputSource !== null && controller !== void 0) controller.update(inputSource, frame, customReferenceSpace || referenceSpace);
			}
			if (onAnimationFrameCallback) onAnimationFrameCallback(time, frame);
			if (frame.detectedPlanes) scope.dispatchEvent({
				type: "planesdetected",
				data: frame
			});
			xrFrame = null;
		}
		const animation = new WebGLAnimation();
		animation.setAnimationLoop(onAnimationFrame);
		this.setAnimationLoop = function(callback) {
			onAnimationFrameCallback = callback;
		};
		this.dispose = function() {};
	}
};
var _m1 = /*@__PURE__*/ new Matrix4();
var _m = /*@__PURE__*/ new Matrix3();
_m.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function WebGLMaterials(renderer, properties) {
	function refreshTransformUniform(map, uniform) {
		if (map.matrixAutoUpdate === true) map.updateMatrix();
		uniform.value.copy(map.matrix);
	}
	function refreshFogUniforms(uniforms, fog) {
		fog.color.getRGB(uniforms.fogColor.value, getUnlitUniformColorSpace(renderer));
		if (fog.isFog) {
			uniforms.fogNear.value = fog.near;
			uniforms.fogFar.value = fog.far;
		} else if (fog.isFogExp2) uniforms.fogDensity.value = fog.density;
	}
	function refreshMaterialUniforms(uniforms, material, pixelRatio, height, transmissionRenderTarget) {
		if (material.isNodeMaterial) material.uniformsNeedUpdate = false;
		else if (material.isMeshBasicMaterial) refreshUniformsCommon(uniforms, material);
		else if (material.isMeshLambertMaterial) {
			refreshUniformsCommon(uniforms, material);
			if (material.envMap) uniforms.envMapIntensity.value = material.envMapIntensity;
		} else if (material.isMeshToonMaterial) {
			refreshUniformsCommon(uniforms, material);
			refreshUniformsToon(uniforms, material);
		} else if (material.isMeshPhongMaterial) {
			refreshUniformsCommon(uniforms, material);
			refreshUniformsPhong(uniforms, material);
			if (material.envMap) uniforms.envMapIntensity.value = material.envMapIntensity;
		} else if (material.isMeshStandardMaterial) {
			refreshUniformsCommon(uniforms, material);
			refreshUniformsStandard(uniforms, material);
			if (material.isMeshPhysicalMaterial) refreshUniformsPhysical(uniforms, material, transmissionRenderTarget);
		} else if (material.isMeshMatcapMaterial) {
			refreshUniformsCommon(uniforms, material);
			refreshUniformsMatcap(uniforms, material);
		} else if (material.isMeshDepthMaterial) refreshUniformsCommon(uniforms, material);
		else if (material.isMeshDistanceMaterial) {
			refreshUniformsCommon(uniforms, material);
			refreshUniformsDistance(uniforms, material);
		} else if (material.isMeshNormalMaterial) refreshUniformsCommon(uniforms, material);
		else if (material.isLineBasicMaterial) {
			refreshUniformsLine(uniforms, material);
			if (material.isLineDashedMaterial) refreshUniformsDash(uniforms, material);
		} else if (material.isPointsMaterial) refreshUniformsPoints(uniforms, material, pixelRatio, height);
		else if (material.isSpriteMaterial) refreshUniformsSprites(uniforms, material);
		else if (material.isShadowMaterial) {
			uniforms.color.value.copy(material.color);
			uniforms.opacity.value = material.opacity;
		} else if (material.isShaderMaterial) material.uniformsNeedUpdate = false;
	}
	function refreshUniformsCommon(uniforms, material) {
		uniforms.opacity.value = material.opacity;
		if (material.color) uniforms.diffuse.value.copy(material.color);
		if (material.emissive) uniforms.emissive.value.copy(material.emissive).multiplyScalar(material.emissiveIntensity);
		if (material.map) {
			uniforms.map.value = material.map;
			refreshTransformUniform(material.map, uniforms.mapTransform);
		}
		if (material.alphaMap) {
			uniforms.alphaMap.value = material.alphaMap;
			refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
		}
		if (material.bumpMap) {
			uniforms.bumpMap.value = material.bumpMap;
			refreshTransformUniform(material.bumpMap, uniforms.bumpMapTransform);
			uniforms.bumpScale.value = material.bumpScale;
			if (material.side === 1) uniforms.bumpScale.value *= -1;
		}
		if (material.normalMap) {
			uniforms.normalMap.value = material.normalMap;
			refreshTransformUniform(material.normalMap, uniforms.normalMapTransform);
			uniforms.normalScale.value.copy(material.normalScale);
			if (material.side === 1) uniforms.normalScale.value.negate();
		}
		if (material.displacementMap) {
			uniforms.displacementMap.value = material.displacementMap;
			refreshTransformUniform(material.displacementMap, uniforms.displacementMapTransform);
			uniforms.displacementScale.value = material.displacementScale;
			uniforms.displacementBias.value = material.displacementBias;
		}
		if (material.emissiveMap) {
			uniforms.emissiveMap.value = material.emissiveMap;
			refreshTransformUniform(material.emissiveMap, uniforms.emissiveMapTransform);
		}
		if (material.specularMap) {
			uniforms.specularMap.value = material.specularMap;
			refreshTransformUniform(material.specularMap, uniforms.specularMapTransform);
		}
		if (material.alphaTest > 0) uniforms.alphaTest.value = material.alphaTest;
		const materialProperties = properties.get(material);
		const envMap = materialProperties.envMap;
		const envMapRotation = materialProperties.envMapRotation;
		if (envMap) {
			uniforms.envMap.value = envMap;
			uniforms.envMapRotation.value.setFromMatrix4(_m1.makeRotationFromEuler(envMapRotation)).transpose();
			if (envMap.isCubeTexture && envMap.isRenderTargetTexture === false) uniforms.envMapRotation.value.premultiply(_m);
			uniforms.reflectivity.value = material.reflectivity;
			uniforms.ior.value = material.ior;
			uniforms.refractionRatio.value = material.refractionRatio;
		}
		if (material.lightMap) {
			uniforms.lightMap.value = material.lightMap;
			uniforms.lightMapIntensity.value = material.lightMapIntensity;
			refreshTransformUniform(material.lightMap, uniforms.lightMapTransform);
		}
		if (material.aoMap) {
			uniforms.aoMap.value = material.aoMap;
			uniforms.aoMapIntensity.value = material.aoMapIntensity;
			refreshTransformUniform(material.aoMap, uniforms.aoMapTransform);
		}
	}
	function refreshUniformsLine(uniforms, material) {
		uniforms.diffuse.value.copy(material.color);
		uniforms.opacity.value = material.opacity;
		if (material.map) {
			uniforms.map.value = material.map;
			refreshTransformUniform(material.map, uniforms.mapTransform);
		}
	}
	function refreshUniformsDash(uniforms, material) {
		uniforms.dashSize.value = material.dashSize;
		uniforms.totalSize.value = material.dashSize + material.gapSize;
		uniforms.scale.value = material.scale;
	}
	function refreshUniformsPoints(uniforms, material, pixelRatio, height) {
		uniforms.diffuse.value.copy(material.color);
		uniforms.opacity.value = material.opacity;
		uniforms.size.value = material.size * pixelRatio;
		uniforms.scale.value = height * .5;
		if (material.map) {
			uniforms.map.value = material.map;
			refreshTransformUniform(material.map, uniforms.uvTransform);
		}
		if (material.alphaMap) {
			uniforms.alphaMap.value = material.alphaMap;
			refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
		}
		if (material.alphaTest > 0) uniforms.alphaTest.value = material.alphaTest;
	}
	function refreshUniformsSprites(uniforms, material) {
		uniforms.diffuse.value.copy(material.color);
		uniforms.opacity.value = material.opacity;
		uniforms.rotation.value = material.rotation;
		if (material.map) {
			uniforms.map.value = material.map;
			refreshTransformUniform(material.map, uniforms.mapTransform);
		}
		if (material.alphaMap) {
			uniforms.alphaMap.value = material.alphaMap;
			refreshTransformUniform(material.alphaMap, uniforms.alphaMapTransform);
		}
		if (material.alphaTest > 0) uniforms.alphaTest.value = material.alphaTest;
	}
	function refreshUniformsPhong(uniforms, material) {
		uniforms.specular.value.copy(material.specular);
		uniforms.shininess.value = Math.max(material.shininess, 1e-4);
	}
	function refreshUniformsToon(uniforms, material) {
		if (material.gradientMap) uniforms.gradientMap.value = material.gradientMap;
	}
	function refreshUniformsStandard(uniforms, material) {
		uniforms.metalness.value = material.metalness;
		if (material.metalnessMap) {
			uniforms.metalnessMap.value = material.metalnessMap;
			refreshTransformUniform(material.metalnessMap, uniforms.metalnessMapTransform);
		}
		uniforms.roughness.value = material.roughness;
		if (material.roughnessMap) {
			uniforms.roughnessMap.value = material.roughnessMap;
			refreshTransformUniform(material.roughnessMap, uniforms.roughnessMapTransform);
		}
		if (material.envMap) uniforms.envMapIntensity.value = material.envMapIntensity;
	}
	function refreshUniformsPhysical(uniforms, material, transmissionRenderTarget) {
		uniforms.ior.value = material.ior;
		if (material.sheen > 0) {
			uniforms.sheenColor.value.copy(material.sheenColor).multiplyScalar(material.sheen);
			uniforms.sheenRoughness.value = material.sheenRoughness;
			if (material.sheenColorMap) {
				uniforms.sheenColorMap.value = material.sheenColorMap;
				refreshTransformUniform(material.sheenColorMap, uniforms.sheenColorMapTransform);
			}
			if (material.sheenRoughnessMap) {
				uniforms.sheenRoughnessMap.value = material.sheenRoughnessMap;
				refreshTransformUniform(material.sheenRoughnessMap, uniforms.sheenRoughnessMapTransform);
			}
		}
		if (material.clearcoat > 0) {
			uniforms.clearcoat.value = material.clearcoat;
			uniforms.clearcoatRoughness.value = material.clearcoatRoughness;
			if (material.clearcoatMap) {
				uniforms.clearcoatMap.value = material.clearcoatMap;
				refreshTransformUniform(material.clearcoatMap, uniforms.clearcoatMapTransform);
			}
			if (material.clearcoatRoughnessMap) {
				uniforms.clearcoatRoughnessMap.value = material.clearcoatRoughnessMap;
				refreshTransformUniform(material.clearcoatRoughnessMap, uniforms.clearcoatRoughnessMapTransform);
			}
			if (material.clearcoatNormalMap) {
				uniforms.clearcoatNormalMap.value = material.clearcoatNormalMap;
				refreshTransformUniform(material.clearcoatNormalMap, uniforms.clearcoatNormalMapTransform);
				uniforms.clearcoatNormalScale.value.copy(material.clearcoatNormalScale);
				if (material.side === 1) uniforms.clearcoatNormalScale.value.negate();
			}
		}
		if (material.dispersion > 0) uniforms.dispersion.value = material.dispersion;
		if (material.retroreflectivity > 0) uniforms.retroreflectivity.value = material.retroreflectivity;
		if (material.iridescence > 0) {
			uniforms.iridescence.value = material.iridescence;
			uniforms.iridescenceIOR.value = material.iridescenceIOR;
			uniforms.iridescenceThicknessMinimum.value = material.iridescenceThicknessRange[0];
			uniforms.iridescenceThicknessMaximum.value = material.iridescenceThicknessRange[1];
			if (material.iridescenceMap) {
				uniforms.iridescenceMap.value = material.iridescenceMap;
				refreshTransformUniform(material.iridescenceMap, uniforms.iridescenceMapTransform);
			}
			if (material.iridescenceThicknessMap) {
				uniforms.iridescenceThicknessMap.value = material.iridescenceThicknessMap;
				refreshTransformUniform(material.iridescenceThicknessMap, uniforms.iridescenceThicknessMapTransform);
			}
		}
		if (material.transmission > 0) {
			uniforms.transmission.value = material.transmission;
			uniforms.transmissionSamplerMap.value = transmissionRenderTarget.texture;
			uniforms.transmissionSamplerSize.value.set(transmissionRenderTarget.width, transmissionRenderTarget.height);
			if (material.transmissionMap) {
				uniforms.transmissionMap.value = material.transmissionMap;
				refreshTransformUniform(material.transmissionMap, uniforms.transmissionMapTransform);
			}
			uniforms.thickness.value = material.thickness;
			if (material.thicknessMap) {
				uniforms.thicknessMap.value = material.thicknessMap;
				refreshTransformUniform(material.thicknessMap, uniforms.thicknessMapTransform);
			}
			uniforms.attenuationDistance.value = material.attenuationDistance;
			uniforms.attenuationColor.value.copy(material.attenuationColor);
		}
		if (material.anisotropy > 0) {
			uniforms.anisotropyVector.value.set(material.anisotropy * Math.cos(material.anisotropyRotation), material.anisotropy * Math.sin(material.anisotropyRotation));
			if (material.anisotropyMap) {
				uniforms.anisotropyMap.value = material.anisotropyMap;
				refreshTransformUniform(material.anisotropyMap, uniforms.anisotropyMapTransform);
			}
		}
		uniforms.specularIntensity.value = material.specularIntensity;
		uniforms.specularColor.value.copy(material.specularColor);
		if (material.specularColorMap) {
			uniforms.specularColorMap.value = material.specularColorMap;
			refreshTransformUniform(material.specularColorMap, uniforms.specularColorMapTransform);
		}
		if (material.specularIntensityMap) {
			uniforms.specularIntensityMap.value = material.specularIntensityMap;
			refreshTransformUniform(material.specularIntensityMap, uniforms.specularIntensityMapTransform);
		}
	}
	function refreshUniformsMatcap(uniforms, material) {
		if (material.matcap) uniforms.matcap.value = material.matcap;
	}
	function refreshUniformsDistance(uniforms, material) {
		const light = properties.get(material).light;
		uniforms.referencePosition.value.setFromMatrixPosition(light.matrixWorld);
		uniforms.nearDistance.value = light.shadow.camera.near;
		uniforms.farDistance.value = light.shadow.camera.far;
	}
	return {
		refreshFogUniforms,
		refreshMaterialUniforms
	};
}
function WebGLUniformsGroups(gl, info, capabilities, state) {
	let buffers = {};
	let updateList = {};
	let allocatedBindingPoints = [];
	const maxBindingPoints = gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS);
	function bind(uniformsGroup, program) {
		const webglProgram = program.program;
		state.uniformBlockBinding(uniformsGroup, webglProgram);
	}
	function update(uniformsGroup, program) {
		let buffer = buffers[uniformsGroup.id];
		if (buffer === void 0) {
			prepareUniformsGroup(uniformsGroup);
			buffer = createBuffer(uniformsGroup);
			buffers[uniformsGroup.id] = buffer;
			uniformsGroup.addEventListener("dispose", onUniformsGroupsDispose);
		}
		const webglProgram = program.program;
		state.updateUBOMapping(uniformsGroup, webglProgram);
		const frame = info.render.frame;
		if (updateList[uniformsGroup.id] !== frame) {
			updateBufferData(uniformsGroup);
			updateList[uniformsGroup.id] = frame;
		}
	}
	function createBuffer(uniformsGroup) {
		const bindingPointIndex = allocateBindingPointIndex();
		uniformsGroup.__bindingPointIndex = bindingPointIndex;
		const buffer = gl.createBuffer();
		const size = uniformsGroup.__size;
		const usage = uniformsGroup.usage;
		gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
		gl.bufferData(gl.UNIFORM_BUFFER, size, usage);
		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPointIndex, buffer);
		return buffer;
	}
	function allocateBindingPointIndex() {
		for (let i = 0; i < maxBindingPoints; i++) if (allocatedBindingPoints.indexOf(i) === -1) {
			allocatedBindingPoints.push(i);
			return i;
		}
		error("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.");
		return 0;
	}
	function updateBufferData(uniformsGroup) {
		const buffer = buffers[uniformsGroup.id];
		const uniforms = uniformsGroup.uniforms;
		const cache = uniformsGroup.__cache;
		gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
		for (let i = 0, il = uniforms.length; i < il; i++) {
			const uniformItem = uniforms[i];
			if (Array.isArray(uniformItem)) for (let j = 0, jl = uniformItem.length; j < jl; j++) updateUniform(uniformItem[j], i, j, cache);
			else updateUniform(uniformItem, i, 0, cache);
		}
		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	}
	function updateUniform(uniform, index, indexArray, cache) {
		if (hasUniformChanged(uniform, index, indexArray, cache) === true) {
			const offset = uniform.__offset;
			const value = uniform.value;
			if (Array.isArray(value)) {
				let arrayOffset = 0;
				for (let k = 0; k < value.length; k++) {
					const val = value[k];
					const info = getUniformSize(val);
					writeUniformValue(val, uniform.__data, arrayOffset);
					if (typeof val !== "number" && typeof val !== "boolean" && !val.isMatrix3 && !ArrayBuffer.isView(val)) arrayOffset += info.storage / Float32Array.BYTES_PER_ELEMENT;
				}
			} else writeUniformValue(value, uniform.__data, 0);
			gl.bufferSubData(gl.UNIFORM_BUFFER, offset, uniform.__data);
		}
	}
	function writeUniformValue(value, data, offset) {
		if (typeof value === "number" || typeof value === "boolean") data[0] = value;
		else if (value.isMatrix3) {
			data[0] = value.elements[0];
			data[1] = value.elements[1];
			data[2] = value.elements[2];
			data[3] = 0;
			data[4] = value.elements[3];
			data[5] = value.elements[4];
			data[6] = value.elements[5];
			data[7] = 0;
			data[8] = value.elements[6];
			data[9] = value.elements[7];
			data[10] = value.elements[8];
			data[11] = 0;
		} else if (ArrayBuffer.isView(value)) data.set(new value.constructor(value.buffer, value.byteOffset, data.length));
		else value.toArray(data, offset);
	}
	function hasUniformChanged(uniform, index, indexArray, cache) {
		const value = uniform.value;
		const indexString = index + "_" + indexArray;
		if (cache[indexString] === void 0) {
			if (typeof value === "number" || typeof value === "boolean") cache[indexString] = value;
			else if (ArrayBuffer.isView(value)) cache[indexString] = value.slice();
			else cache[indexString] = value.clone();
			return true;
		} else {
			const cachedObject = cache[indexString];
			if (typeof value === "number" || typeof value === "boolean") {
				if (cachedObject !== value) {
					cache[indexString] = value;
					return true;
				}
			} else if (ArrayBuffer.isView(value)) return true;
			else if (cachedObject.equals(value) === false) {
				cachedObject.copy(value);
				return true;
			}
		}
		return false;
	}
	function prepareUniformsGroup(uniformsGroup) {
		const uniforms = uniformsGroup.uniforms;
		let offset = 0;
		const chunkSize = 16;
		for (let i = 0, l = uniforms.length; i < l; i++) {
			const uniformArray = Array.isArray(uniforms[i]) ? uniforms[i] : [uniforms[i]];
			for (let j = 0, jl = uniformArray.length; j < jl; j++) {
				const uniform = uniformArray[j];
				const values = Array.isArray(uniform.value) ? uniform.value : [uniform.value];
				for (let k = 0, kl = values.length; k < kl; k++) {
					const value = values[k];
					const info = getUniformSize(value);
					const chunkOffset = offset % chunkSize;
					const chunkPadding = chunkOffset % info.boundary;
					const chunkStart = chunkOffset + chunkPadding;
					offset += chunkPadding;
					if (chunkStart !== 0 && chunkSize - chunkStart < info.storage) offset += chunkSize - chunkStart;
					uniform.__data = new Float32Array(info.storage / Float32Array.BYTES_PER_ELEMENT);
					uniform.__offset = offset;
					offset += info.storage;
				}
			}
		}
		const chunkOffset = offset % chunkSize;
		if (chunkOffset > 0) offset += chunkSize - chunkOffset;
		uniformsGroup.__size = offset;
		uniformsGroup.__cache = {};
		return this;
	}
	function getUniformSize(value) {
		const info = {
			boundary: 0,
			storage: 0
		};
		if (typeof value === "number" || typeof value === "boolean") {
			info.boundary = 4;
			info.storage = 4;
		} else if (value.isVector2) {
			info.boundary = 8;
			info.storage = 8;
		} else if (value.isVector3 || value.isColor) {
			info.boundary = 16;
			info.storage = 12;
		} else if (value.isVector4) {
			info.boundary = 16;
			info.storage = 16;
		} else if (value.isMatrix3) {
			info.boundary = 48;
			info.storage = 48;
		} else if (value.isMatrix4) {
			info.boundary = 64;
			info.storage = 64;
		} else if (value.isTexture) warn("WebGLRenderer: Texture samplers can not be part of an uniforms group.");
		else if (ArrayBuffer.isView(value)) {
			info.boundary = 16;
			info.storage = value.byteLength;
		} else warn("WebGLRenderer: Unsupported uniform value type.", value);
		return info;
	}
	function onUniformsGroupsDispose(event) {
		const uniformsGroup = event.target;
		uniformsGroup.removeEventListener("dispose", onUniformsGroupsDispose);
		const index = allocatedBindingPoints.indexOf(uniformsGroup.__bindingPointIndex);
		allocatedBindingPoints.splice(index, 1);
		gl.deleteBuffer(buffers[uniformsGroup.id]);
		delete buffers[uniformsGroup.id];
		delete updateList[uniformsGroup.id];
	}
	function dispose() {
		for (const id in buffers) gl.deleteBuffer(buffers[id]);
		allocatedBindingPoints = [];
		buffers = {};
		updateList = {};
	}
	return {
		bind,
		update,
		dispose
	};
}
/**
* Precomputed DFG LUT for physically based specular lighting, used by both
* image-based lighting and direct-light multi-scattering energy compensation
* Resolution: 16x16
* Samples: 4096 per texel
* Format: RG16F (2 half floats per texel: scale, bias)
*/
var DATA = new Uint16Array([
	12469,
	15057,
	12620,
	14925,
	13266,
	14620,
	13807,
	14376,
	14323,
	13990,
	14545,
	13625,
	14713,
	13328,
	14840,
	12882,
	14931,
	12528,
	14996,
	12233,
	15039,
	11829,
	15066,
	11525,
	15080,
	11295,
	15085,
	10976,
	15082,
	10705,
	15073,
	10495,
	13880,
	14564,
	13898,
	14542,
	13977,
	14430,
	14158,
	14124,
	14393,
	13732,
	14556,
	13410,
	14702,
	12996,
	14814,
	12596,
	14891,
	12291,
	14937,
	11834,
	14957,
	11489,
	14958,
	11194,
	14943,
	10803,
	14921,
	10506,
	14893,
	10278,
	14858,
	9960,
	14484,
	14039,
	14487,
	14025,
	14499,
	13941,
	14524,
	13740,
	14574,
	13468,
	14654,
	13106,
	14743,
	12678,
	14818,
	12344,
	14867,
	11893,
	14889,
	11509,
	14893,
	11180,
	14881,
	10751,
	14852,
	10428,
	14812,
	10128,
	14765,
	9754,
	14712,
	9466,
	14764,
	13480,
	14764,
	13475,
	14766,
	13440,
	14766,
	13347,
	14769,
	13070,
	14786,
	12713,
	14816,
	12387,
	14844,
	11957,
	14860,
	11549,
	14868,
	11215,
	14855,
	10751,
	14825,
	10403,
	14782,
	10044,
	14729,
	9651,
	14666,
	9352,
	14599,
	9029,
	14967,
	12835,
	14966,
	12831,
	14963,
	12804,
	14954,
	12723,
	14936,
	12564,
	14917,
	12347,
	14900,
	11958,
	14886,
	11569,
	14878,
	11247,
	14859,
	10765,
	14828,
	10401,
	14784,
	10011,
	14727,
	9600,
	14660,
	9289,
	14586,
	8893,
	14508,
	8533,
	15111,
	12234,
	15110,
	12234,
	15104,
	12216,
	15092,
	12156,
	15067,
	12010,
	15028,
	11776,
	14981,
	11500,
	14942,
	11205,
	14902,
	10752,
	14861,
	10393,
	14812,
	9991,
	14752,
	9570,
	14682,
	9252,
	14603,
	8808,
	14519,
	8445,
	14431,
	8145,
	15209,
	11449,
	15208,
	11451,
	15202,
	11451,
	15190,
	11438,
	15163,
	11384,
	15117,
	11274,
	15055,
	10979,
	14994,
	10648,
	14932,
	10343,
	14871,
	9936,
	14803,
	9532,
	14729,
	9218,
	14645,
	8742,
	14556,
	8381,
	14461,
	8020,
	14365,
	7603,
	15273,
	10603,
	15272,
	10607,
	15267,
	10619,
	15256,
	10631,
	15231,
	10614,
	15182,
	10535,
	15118,
	10389,
	15042,
	10167,
	14963,
	9787,
	14883,
	9447,
	14800,
	9115,
	14710,
	8665,
	14615,
	8318,
	14514,
	7911,
	14411,
	7507,
	14279,
	7198,
	15314,
	9675,
	15313,
	9683,
	15309,
	9712,
	15298,
	9759,
	15277,
	9797,
	15229,
	9773,
	15166,
	9668,
	15084,
	9487,
	14995,
	9274,
	14898,
	8910,
	14800,
	8539,
	14697,
	8234,
	14590,
	7790,
	14479,
	7409,
	14367,
	7067,
	14178,
	6621,
	15337,
	8619,
	15337,
	8631,
	15333,
	8677,
	15325,
	8769,
	15305,
	8871,
	15264,
	8940,
	15202,
	8909,
	15119,
	8775,
	15022,
	8565,
	14916,
	8328,
	14804,
	8009,
	14688,
	7614,
	14569,
	7287,
	14448,
	6888,
	14321,
	6483,
	14088,
	6171,
	15350,
	7402,
	15350,
	7419,
	15347,
	7480,
	15340,
	7613,
	15322,
	7804,
	15287,
	7973,
	15229,
	8057,
	15148,
	8012,
	15046,
	7846,
	14933,
	7611,
	14810,
	7357,
	14682,
	7069,
	14552,
	6656,
	14421,
	6316,
	14251,
	5948,
	14007,
	5528,
	15356,
	5942,
	15356,
	5977,
	15353,
	6119,
	15348,
	6294,
	15332,
	6551,
	15302,
	6824,
	15249,
	7044,
	15171,
	7122,
	15070,
	7050,
	14949,
	6861,
	14818,
	6611,
	14679,
	6349,
	14538,
	6067,
	14398,
	5651,
	14189,
	5311,
	13935,
	4958,
	15359,
	4123,
	15359,
	4153,
	15356,
	4296,
	15353,
	4646,
	15338,
	5160,
	15311,
	5508,
	15263,
	5829,
	15188,
	6042,
	15088,
	6094,
	14966,
	6001,
	14826,
	5796,
	14678,
	5543,
	14527,
	5287,
	14377,
	4985,
	14133,
	4586,
	13869,
	4257,
	15360,
	1563,
	15360,
	1642,
	15358,
	2076,
	15354,
	2636,
	15341,
	3350,
	15317,
	4019,
	15273,
	4429,
	15203,
	4732,
	15105,
	4911,
	14981,
	4932,
	14836,
	4818,
	14679,
	4621,
	14517,
	4386,
	14359,
	4156,
	14083,
	3795,
	13808,
	3437,
	15360,
	122,
	15360,
	137,
	15358,
	285,
	15355,
	636,
	15344,
	1274,
	15322,
	2177,
	15281,
	2765,
	15215,
	3223,
	15120,
	3451,
	14995,
	3569,
	14846,
	3567,
	14681,
	3466,
	14511,
	3305,
	14344,
	3121,
	14037,
	2800,
	13753,
	2467,
	15360,
	0,
	15360,
	1,
	15359,
	21,
	15355,
	89,
	15346,
	253,
	15325,
	479,
	15287,
	796,
	15225,
	1148,
	15133,
	1492,
	15008,
	1749,
	14856,
	1882,
	14685,
	1886,
	14506,
	1783,
	14324,
	1608,
	13996,
	1398,
	13702,
	1183
]);
var lut = null;
function getDFGLUT() {
	if (lut === null) {
		lut = new DataTexture(DATA, 16, 16, RGFormat, HalfFloatType);
		lut.name = "DFG_LUT";
		lut.minFilter = LinearFilter;
		lut.magFilter = LinearFilter;
		lut.wrapS = ClampToEdgeWrapping;
		lut.wrapT = ClampToEdgeWrapping;
		lut.generateMipmaps = false;
		lut.needsUpdate = true;
	}
	return lut;
}
/**
* This renderer uses WebGL 2 to display scenes.
*
* WebGL 1 is not supported since `r163`.
*/
var WebGLRenderer = class {
	/**
	* Constructs a new WebGL renderer.
	*
	* @param {WebGLRenderer~Options} [parameters] - The configuration parameter.
	*/
	constructor(parameters = {}) {
		const { canvas = createCanvasElement(), context = null, depth = true, stencil = false, alpha = false, antialias = false, premultipliedAlpha = true, preserveDrawingBuffer = false, powerPreference = "default", failIfMajorPerformanceCaveat = false, reversedDepthBuffer = false, outputBufferType = UnsignedByteType } = parameters;
		/**
		* This flag can be used for type testing.
		*
		* @type {boolean}
		* @readonly
		* @default true
		*/
		this.isWebGLRenderer = true;
		let _alpha;
		if (context !== null) {
			if (typeof WebGLRenderingContext !== "undefined" && context instanceof WebGLRenderingContext) throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
			_alpha = context.getContextAttributes().alpha;
		} else _alpha = alpha;
		const _outputBufferType = outputBufferType;
		const INTEGER_FORMATS = /* @__PURE__ */ new Set([
			RGBAIntegerFormat,
			RGIntegerFormat,
			RedIntegerFormat
		]);
		const UNSIGNED_TYPES = /* @__PURE__ */ new Set([
			UnsignedByteType,
			UnsignedIntType,
			UnsignedShortType,
			UnsignedInt248Type,
			UnsignedShort4444Type,
			UnsignedShort5551Type
		]);
		const uintClearColor = /* @__PURE__ */ new Uint32Array(4);
		const intClearColor = /* @__PURE__ */ new Int32Array(4);
		const objectPosition = new Vector3();
		let currentRenderList = null;
		let currentRenderState = null;
		const renderListStack = [];
		const renderStateStack = [];
		let output = null;
		/**
		* A canvas where the renderer draws its output. This is automatically created by the renderer
		* in the constructor (if not provided already); you just need to add it to your page like so:
		* ```js
		* document.body.appendChild( renderer.domElement );
		* ```
		*
		* @type {HTMLCanvasElement|OffscreenCanvas}
		*/
		this.domElement = canvas;
		/**
		* A object with debug configuration settings.
		*
		* - `checkShaderErrors`: If it is `true`, defines whether material shader programs are
		* checked for errors during compilation and linkage process. It may be useful to disable
		* this check in production for performance gain. It is strongly recommended to keep these
		* checks enabled during development. If the shader does not compile and link, it will not
		* work and associated material will not render.
		* - `onShaderError(gl, program, glVertexShader,glFragmentShader)`: A callback function that
		* can be used for custom error reporting. The callback receives the WebGL context, an instance
		* of WebGLProgram as well two instances of WebGLShader representing the vertex and fragment shader.
		* Assigning a custom function disables the default error reporting.
		*
		* @type {Object}
		*/
		this.debug = {
			/**
			* Enables error checking and reporting when shader programs are being compiled.
			* @type {boolean}
			*/
			checkShaderErrors: true,
			/**
			* Diagnostics configuration for the shader generation. Only relevant for TSL.
			* @type {Object}
			* @property {boolean} keywords - Whether declaration names that collide with reserved keywords of the shading language should be renamed or not.
			*/
			diagnostics: { keywords: false },
			/**
			* Callback for custom error reporting.
			* @type {?Function}
			*/
			onShaderError: null
		};
		/**
		* Whether the renderer should automatically clear its output before rendering a frame or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.autoClear = true;
		/**
		* If {@link WebGLRenderer#autoClear} set to `true`, whether the renderer should clear
		* the color buffer or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.autoClearColor = true;
		/**
		* If {@link WebGLRenderer#autoClear} set to `true`, whether the renderer should clear
		* the depth buffer or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.autoClearDepth = true;
		/**
		* If {@link WebGLRenderer#autoClear} set to `true`, whether the renderer should clear
		* the stencil buffer or not.
		*
		* @type {boolean}
		* @default true
		*/
		this.autoClearStencil = true;
		/**
		* Whether the renderer should sort objects or not.
		*
		* Note: Sorting is used to attempt to properly render objects that have some
		* degree of transparency. By definition, sorting objects may not work in all
		* cases. Depending on the needs of application, it may be necessary to turn
		* off sorting and use other methods to deal with transparency rendering e.g.
		* manually determining each object's rendering order.
		*
		* @type {boolean}
		* @default true
		*/
		this.sortObjects = true;
		/**
		* User-defined clipping planes specified in world space. These planes apply globally.
		* Points in space whose dot product with the plane is negative are cut away.
		*
		* @type {Array<Plane>}
		*/
		this.clippingPlanes = [];
		/**
		* Whether the renderer respects object-level clipping planes or not.
		*
		* @type {boolean}
		* @default false
		*/
		this.localClippingEnabled = false;
		/**
		* The tone mapping technique of the renderer.
		*
		* @type {(NoToneMapping|LinearToneMapping|ReinhardToneMapping|CineonToneMapping|ACESFilmicToneMapping|CustomToneMapping|AgXToneMapping|NeutralToneMapping)}
		* @default NoToneMapping
		*/
		this.toneMapping = 0;
		/**
		* Exposure level of tone mapping.
		*
		* @type {number}
		* @default 1
		*/
		this.toneMappingExposure = 1;
		/**
		* The normalized resolution scale for the transmission render target, measured in percentage
		* of viewport dimensions. Lowering this value can result in significant performance improvements
		* when using {@link MeshPhysicalMaterial#transmission}.
		*
		* @type {number}
		* @default 1
		*/
		this.transmissionResolutionScale = 1;
		const _this = this;
		let _isContextLost = false;
		let _nodesHandler = null;
		let _scratchFramebuffer = null;
		let _srcFramebuffer = null;
		let _dstFramebuffer = null;
		this._outputColorSpace = SRGBColorSpace;
		let _currentActiveCubeFace = 0;
		let _currentActiveMipmapLevel = 0;
		let _currentRenderTarget = null;
		let _currentMaterialId = -1;
		let _currentCamera = null;
		const _currentViewport = new Vector4();
		const _currentScissor = new Vector4();
		let _currentScissorTest = null;
		const _currentClearColor = new Color(0);
		let _currentClearAlpha = 0;
		let _width = canvas.width;
		let _height = canvas.height;
		let _pixelRatio = 1;
		let _opaqueSort = null;
		let _transparentSort = null;
		const _viewport = new Vector4(0, 0, _width, _height);
		const _scissor = new Vector4(0, 0, _width, _height);
		let _scissorTest = false;
		const _frustum = new Frustum();
		let _clippingEnabled = false;
		let _localClippingEnabled = false;
		const _projScreenMatrix = new Matrix4();
		const _vector3 = new Vector3();
		const _vector4 = new Vector4();
		const _emptyScene = {
			background: null,
			fog: null,
			environment: null,
			overrideMaterial: null,
			isScene: true
		};
		let _renderBackground = false;
		function getTargetPixelRatio() {
			return _currentRenderTarget === null ? _pixelRatio : 1;
		}
		let _gl = context;
		function getContext(contextName, contextAttributes) {
			return canvas.getContext(contextName, contextAttributes);
		}
		let extensions, capabilities, state, info;
		let properties, textures, environments, attributes, geometries, objects;
		let programCache, materials, renderLists, renderStates, clipping, shadowMap;
		let background, morphtargets, bufferRenderer, indexedBufferRenderer;
		let utils, bindingStates, uniformsGroups;
		try {
			const contextAttributes = {
				alpha: true,
				depth,
				stencil,
				antialias,
				premultipliedAlpha,
				preserveDrawingBuffer,
				powerPreference,
				failIfMajorPerformanceCaveat
			};
			if ("setAttribute" in canvas) canvas.setAttribute("data-engine", `three.js r186`);
			canvas.addEventListener("webglcontextlost", onContextLost, false);
			canvas.addEventListener("webglcontextrestored", onContextRestore, false);
			canvas.addEventListener("webglcontextcreationerror", onContextCreationError, false);
			if (_gl === null) {
				const contextName = "webgl2";
				_gl = getContext(contextName, contextAttributes);
				if (_gl === null) {
					if (getContext(contextName)) throw new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");
					else throw new Error("THREE.WebGLRenderer: Error creating WebGL context.");
				}
			}
			initGLContext();
		} catch (e) {
			canvas.removeEventListener("webglcontextlost", onContextLost, false);
			canvas.removeEventListener("webglcontextrestored", onContextRestore, false);
			canvas.removeEventListener("webglcontextcreationerror", onContextCreationError, false);
			error("WebGLRenderer: " + e.message);
			throw e;
		}
		function initGLContext() {
			extensions = new WebGLExtensions(_gl);
			extensions.init();
			utils = new WebGLUtils(_gl, extensions);
			capabilities = new WebGLCapabilities(_gl, extensions, parameters, utils);
			state = new WebGLState(_gl, extensions);
			if (capabilities.reversedDepthBuffer && reversedDepthBuffer) state.buffers.depth.setReversed(true);
			_scratchFramebuffer = _gl.createFramebuffer();
			_srcFramebuffer = _gl.createFramebuffer();
			_dstFramebuffer = _gl.createFramebuffer();
			info = new WebGLInfo(_gl);
			properties = new WebGLProperties();
			textures = new WebGLTextures(_gl, extensions, state, properties, capabilities, utils, info);
			environments = new WebGLEnvironments(_this);
			attributes = new WebGLAttributes(_gl);
			bindingStates = new WebGLBindingStates(_gl, attributes);
			geometries = new WebGLGeometries(_gl, attributes, info, bindingStates);
			objects = new WebGLObjects(_gl, geometries, attributes, bindingStates, info);
			morphtargets = new WebGLMorphtargets(_gl, capabilities, textures);
			clipping = new WebGLClipping(properties);
			programCache = new WebGLPrograms(_this, environments, extensions, capabilities, bindingStates, clipping);
			materials = new WebGLMaterials(_this, properties);
			renderLists = new WebGLRenderLists();
			renderStates = new WebGLRenderStates(extensions);
			background = new WebGLBackground(_this, environments, state, objects, _alpha, premultipliedAlpha);
			shadowMap = new WebGLShadowMap(_this, objects, capabilities);
			uniformsGroups = new WebGLUniformsGroups(_gl, info, capabilities, state);
			bufferRenderer = new WebGLBufferRenderer(_gl, extensions, info);
			indexedBufferRenderer = new WebGLIndexedBufferRenderer(_gl, extensions, info);
			info.programs = programCache.programs;
			/**
			* Holds details about the capabilities of the current rendering context.
			*
			* @name WebGLRenderer#capabilities
			* @type {WebGLRenderer~Capabilities}
			*/
			_this.capabilities = capabilities;
			/**
			* Provides methods for retrieving and testing WebGL extensions.
			*
			* - `get(extensionName:string)`: Used to check whether a WebGL extension is supported
			* and return the extension object if available.
			* - `has(extensionName:string)`: returns `true` if the extension is supported.
			*
			* @name WebGLRenderer#extensions
			* @type {Object}
			*/
			_this.extensions = extensions;
			/**
			* Used to track properties of other objects like native WebGL objects.
			*
			* @name WebGLRenderer#properties
			* @type {Object}
			*/
			_this.properties = properties;
			/**
			* Manages the render lists of the renderer.
			*
			* @name WebGLRenderer#renderLists
			* @type {Object}
			*/
			_this.renderLists = renderLists;
			/**
			* Interface for managing shadows.
			*
			* @name WebGLRenderer#shadowMap
			* @type {WebGLRenderer~ShadowMap}
			*/
			_this.shadowMap = shadowMap;
			/**
			* Interface for managing the WebGL state.
			*
			* @name WebGLRenderer#state
			* @type {Object}
			*/
			_this.state = state;
			/**
			* Holds a series of statistical information about the GPU memory
			* and the rendering process. Useful for debugging and monitoring.
			*
			* By default these data are reset at each render call but when having
			* multiple render passes per frame (e.g. when using post processing) it can
			* be preferred to reset with a custom pattern. First, set `autoReset` to
			* `false`.
			* ```js
			* renderer.info.autoReset = false;
			* ```
			* Call `reset()` whenever you have finished to render a single frame.
			* ```js
			* renderer.info.reset();
			* ```
			*
			* @name WebGLRenderer#info
			* @type {WebGLRenderer~Info}
			*/
			_this.info = info;
		}
		if (_outputBufferType !== 1009) output = new WebGLOutput(_outputBufferType, canvas.width, canvas.height, antialias, depth, stencil);
		const xr = new WebXRManager(_this, _gl);
		/**
		* A reference to the XR manager.
		*
		* @type {WebXRManager}
		*/
		this.xr = xr;
		/**
		* Returns the rendering context.
		*
		* @return {WebGL2RenderingContext} The rendering context.
		*/
		this.getContext = function() {
			return _gl;
		};
		/**
		* Returns the rendering context attributes.
		*
		* @return {WebGLContextAttributes} The rendering context attributes.
		*/
		this.getContextAttributes = function() {
			return _gl.getContextAttributes();
		};
		/**
		* Simulates a loss of the WebGL context. This requires support for the `WEBGL_lose_context` extension.
		*/
		this.forceContextLoss = function() {
			const extension = extensions.get("WEBGL_lose_context");
			if (extension) extension.loseContext();
		};
		/**
		* Simulates a restore of the WebGL context. This requires support for the `WEBGL_lose_context` extension.
		*/
		this.forceContextRestore = function() {
			const extension = extensions.get("WEBGL_lose_context");
			if (extension) extension.restoreContext();
		};
		/**
		* Returns the pixel ratio.
		*
		* @return {number} The pixel ratio.
		*/
		this.getPixelRatio = function() {
			return _pixelRatio;
		};
		/**
		* Sets the given pixel ratio and resizes the canvas if necessary.
		*
		* @param {number} value - The pixel ratio.
		*/
		this.setPixelRatio = function(value) {
			if (value === void 0) return;
			_pixelRatio = value;
			this.setSize(_width, _height, false);
		};
		/**
		* Returns the renderer's size in logical pixels. This method does not honor the pixel ratio.
		*
		* @param {Vector2} target - The method writes the result in this target object.
		* @return {Vector2} The renderer's size in logical pixels.
		*/
		this.getSize = function(target) {
			return target.set(_width, _height);
		};
		/**
		* Resizes the output canvas to (width, height) with device pixel ratio taken
		* into account, and also sets the viewport to fit that size, starting in (0,
		* 0). Setting `updateStyle` to false prevents any style changes to the output canvas.
		*
		* @param {number} width - The width in logical pixels.
		* @param {number} height - The height in logical pixels.
		* @param {boolean} [updateStyle=true] - Whether to update the `style` attribute of the canvas or not.
		*/
		this.setSize = function(width, height, updateStyle = true) {
			if (xr.isPresenting) {
				warn("WebGLRenderer: Can't change size while VR device is presenting.");
				return;
			}
			_width = width;
			_height = height;
			canvas.width = Math.floor(width * _pixelRatio);
			canvas.height = Math.floor(height * _pixelRatio);
			if (updateStyle === true) {
				canvas.style.width = width + "px";
				canvas.style.height = height + "px";
			}
			if (output !== null) output.setSize(canvas.width, canvas.height);
			this.setViewport(0, 0, width, height);
		};
		/**
		* Returns the drawing buffer size in physical pixels. This method honors the pixel ratio.
		*
		* @param {Vector2} target - The method writes the result in this target object.
		* @return {Vector2} The drawing buffer size.
		*/
		this.getDrawingBufferSize = function(target) {
			return target.set(_width * _pixelRatio, _height * _pixelRatio).floor();
		};
		/**
		* This method allows to define the drawing buffer size by specifying
		* width, height and pixel ratio all at once. The size of the drawing
		* buffer is computed with this formula:
		* ```js
		* size.x = width * pixelRatio;
		* size.y = height * pixelRatio;
		* ```
		*
		* @param {number} width - The width in logical pixels.
		* @param {number} height - The height in logical pixels.
		* @param {number} pixelRatio - The pixel ratio.
		*/
		this.setDrawingBufferSize = function(width, height, pixelRatio) {
			_width = width;
			_height = height;
			_pixelRatio = pixelRatio;
			canvas.width = Math.floor(width * pixelRatio);
			canvas.height = Math.floor(height * pixelRatio);
			this.setViewport(0, 0, width, height);
		};
		/**
		* Sets the post-processing effects to be applied after rendering.
		*
		* @param {Array} effects - An array of post-processing effects.
		*/
		this.setEffects = function(effects) {
			if (_outputBufferType === 1009) {
				error("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");
				return;
			}
			if (effects) {
				for (let i = 0; i < effects.length; i++) if (effects[i].isOutputPass === true) {
					warn("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");
					break;
				}
			}
			output.setEffects(effects || []);
		};
		/**
		* Returns the current viewport definition.
		*
		* @param {Vector2} target - The method writes the result in this target object.
		* @return {Vector2} The current viewport definition.
		*/
		this.getCurrentViewport = function(target) {
			return target.copy(_currentViewport);
		};
		/**
		* Returns the viewport definition.
		*
		* @param {Vector4} target - The method writes the result in this target object.
		* @return {Vector4} The viewport definition.
		*/
		this.getViewport = function(target) {
			return target.copy(_viewport);
		};
		/**
		* Sets the viewport to render from `(x, y)` to `(x + width, y + height)`.
		*
		* @param {number | Vector4} x - The horizontal coordinate for the lower left corner of the viewport origin in logical pixel unit.
		* Or alternatively a four-component vector specifying all the parameters of the viewport.
		* @param {number} y - The vertical coordinate for the lower left corner of the viewport origin  in logical pixel unit.
		* @param {number} width - The width of the viewport in logical pixel unit.
		* @param {number} height - The height of the viewport in logical pixel unit.
		*/
		this.setViewport = function(x, y, width, height) {
			if (x.isVector4) _viewport.set(x.x, x.y, x.z, x.w);
			else _viewport.set(x, y, width, height);
			state.viewport(_currentViewport.copy(_viewport).multiplyScalar(_pixelRatio).round());
		};
		/**
		* Returns the scissor region.
		*
		* @param {Vector4} target - The method writes the result in this target object.
		* @return {Vector4} The scissor region.
		*/
		this.getScissor = function(target) {
			return target.copy(_scissor);
		};
		/**
		* Sets the scissor region to render from `(x, y)` to `(x + width, y + height)`.
		*
		* @param {number | Vector4} x - The horizontal coordinate for the lower left corner of the scissor region origin in logical pixel unit.
		* Or alternatively a four-component vector specifying all the parameters of the scissor region.
		* @param {number} y - The vertical coordinate for the lower left corner of the scissor region origin  in logical pixel unit.
		* @param {number} width - The width of the scissor region in logical pixel unit.
		* @param {number} height - The height of the scissor region in logical pixel unit.
		*/
		this.setScissor = function(x, y, width, height) {
			if (x.isVector4) _scissor.set(x.x, x.y, x.z, x.w);
			else _scissor.set(x, y, width, height);
			state.scissor(_currentScissor.copy(_scissor).multiplyScalar(_pixelRatio).round());
		};
		/**
		* Returns `true` if the scissor test is enabled.
		*
		* @return {boolean} Whether the scissor test is enabled or not.
		*/
		this.getScissorTest = function() {
			return _scissorTest;
		};
		/**
		* Enable or disable the scissor test. When this is enabled, only the pixels
		* within the defined scissor area will be affected by further renderer
		* actions.
		*
		* @param {boolean} boolean - Whether the scissor test is enabled or not.
		*/
		this.setScissorTest = function(boolean) {
			state.setScissorTest(_scissorTest = boolean);
		};
		/**
		* Sets a custom opaque sort function for the render lists. Pass `null`
		* to use the default `painterSortStable` function.
		*
		* @param {?Function} method - The opaque sort function.
		*/
		this.setOpaqueSort = function(method) {
			_opaqueSort = method;
		};
		/**
		* Sets a custom transparent sort function for the render lists. Pass `null`
		* to use the default `reversePainterSortStable` function.
		*
		* @param {?Function} method - The opaque sort function.
		*/
		this.setTransparentSort = function(method) {
			_transparentSort = method;
		};
		/**
		* Returns the clear color.
		*
		* @param {Color} target - The method writes the result in this target object.
		* @return {Color} The clear color.
		*/
		this.getClearColor = function(target) {
			return target.copy(background.getClearColor());
		};
		/**
		* Sets the clear color and alpha.
		*
		* @param {Color} color - The clear color.
		* @param {number} [alpha=1] - The clear alpha.
		*/
		this.setClearColor = function() {
			background.setClearColor(...arguments);
		};
		/**
		* Returns the clear alpha. Ranges within `[0,1]`.
		*
		* @return {number} The clear alpha.
		*/
		this.getClearAlpha = function() {
			return background.getClearAlpha();
		};
		/**
		* Sets the clear alpha.
		*
		* @param {number} alpha - The clear alpha.
		*/
		this.setClearAlpha = function() {
			background.setClearAlpha(...arguments);
		};
		/**
		* Tells the renderer to clear its color, depth or stencil drawing buffer(s).
		* This method initializes the buffers to the current clear color values.
		*
		* @param {boolean} [color=true] - Whether the color buffer should be cleared or not.
		* @param {boolean} [depth=true] - Whether the depth buffer should be cleared or not.
		* @param {boolean} [stencil=true] - Whether the stencil buffer should be cleared or not.
		*/
		this.clear = function(color = true, depth = true, stencil = true) {
			let bits = 0;
			if (color) {
				let isIntegerFormat = false;
				if (_currentRenderTarget !== null) {
					const targetFormat = _currentRenderTarget.texture.format;
					isIntegerFormat = INTEGER_FORMATS.has(targetFormat);
				}
				if (isIntegerFormat) {
					const targetType = _currentRenderTarget.texture.type;
					const isUnsignedType = UNSIGNED_TYPES.has(targetType);
					const clearColor = background.getClearColor();
					const a = background.getClearAlpha();
					const r = clearColor.r;
					const g = clearColor.g;
					const b = clearColor.b;
					if (isUnsignedType) {
						uintClearColor[0] = r;
						uintClearColor[1] = g;
						uintClearColor[2] = b;
						uintClearColor[3] = a;
						_gl.clearBufferuiv(_gl.COLOR, 0, uintClearColor);
					} else {
						intClearColor[0] = r;
						intClearColor[1] = g;
						intClearColor[2] = b;
						intClearColor[3] = a;
						_gl.clearBufferiv(_gl.COLOR, 0, intClearColor);
					}
				} else bits |= _gl.COLOR_BUFFER_BIT;
			}
			if (depth) {
				bits |= _gl.DEPTH_BUFFER_BIT;
				this.state.buffers.depth.setMask(true);
			}
			if (stencil) {
				bits |= _gl.STENCIL_BUFFER_BIT;
				this.state.buffers.stencil.setMask(4294967295);
			}
			if (bits !== 0) _gl.clear(bits);
		};
		/**
		* Clears the color buffer. Equivalent to calling `renderer.clear( true, false, false )`.
		*/
		this.clearColor = function() {
			this.clear(true, false, false);
		};
		/**
		* Clears the depth buffer. Equivalent to calling `renderer.clear( false, true, false )`.
		*/
		this.clearDepth = function() {
			this.clear(false, true, false);
		};
		/**
		* Clears the stencil buffer. Equivalent to calling `renderer.clear( false, false, true )`.
		*/
		this.clearStencil = function() {
			this.clear(false, false, true);
		};
		/**
		* Sets a compatibility node builder for rendering node materials with WebGLRenderer.
		* This enables using TSL (Three.js Shading Language) node materials to prepare
		* for migration to WebGPURenderer.
		*
		* @param {WebGLNodesHandler} nodesHandler - The node builder instance.
		*/
		this.setNodesHandler = function(nodesHandler) {
			nodesHandler.setRenderer(this);
			_nodesHandler = nodesHandler;
		};
		/**
		* Frees the GPU-related resources allocated by this instance. Call this
		* method whenever this instance is no longer used in your app.
		*/
		this.dispose = function() {
			canvas.removeEventListener("webglcontextlost", onContextLost, false);
			canvas.removeEventListener("webglcontextrestored", onContextRestore, false);
			canvas.removeEventListener("webglcontextcreationerror", onContextCreationError, false);
			background.dispose();
			renderLists.dispose();
			renderStates.dispose();
			properties.dispose();
			environments.dispose();
			objects.dispose();
			bindingStates.dispose();
			uniformsGroups.dispose();
			programCache.dispose();
			xr.dispose();
			xr.removeEventListener("sessionstart", onXRSessionStart);
			xr.removeEventListener("sessionend", onXRSessionEnd);
			animation.stop();
		};
		function onContextLost(event) {
			event.preventDefault();
			log("WebGLRenderer: Context Lost.");
			_isContextLost = true;
		}
		function onContextRestore() {
			log("WebGLRenderer: Context Restored.");
			_isContextLost = false;
			const infoAutoReset = info.autoReset;
			const shadowMapEnabled = shadowMap.enabled;
			const shadowMapAutoUpdate = shadowMap.autoUpdate;
			const shadowMapNeedsUpdate = shadowMap.needsUpdate;
			const shadowMapType = shadowMap.type;
			initGLContext();
			info.autoReset = infoAutoReset;
			shadowMap.enabled = shadowMapEnabled;
			shadowMap.autoUpdate = shadowMapAutoUpdate;
			shadowMap.needsUpdate = shadowMapNeedsUpdate;
			shadowMap.type = shadowMapType;
		}
		function onContextCreationError(event) {
			error("WebGLRenderer: A WebGL context could not be created. Reason: ", event.statusMessage);
		}
		function onMaterialDispose(event) {
			const material = event.target;
			material.removeEventListener("dispose", onMaterialDispose);
			deallocateMaterial(material);
		}
		function deallocateMaterial(material) {
			releaseMaterialProgramReferences(material);
			properties.remove(material);
		}
		function releaseMaterialProgramReferences(material) {
			const programs = properties.get(material).programs;
			if (programs !== void 0) {
				programs.forEach(function(program) {
					programCache.releaseProgram(program);
				});
				if (material.isShaderMaterial) programCache.releaseShaderCache(material);
			}
		}
		this.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
			if (scene === null) scene = _emptyScene;
			const frontFaceCW = object.isMesh && object.matrixWorld.determinantAffine() < 0;
			const program = setProgram(camera, scene, geometry, material, object);
			state.setMaterial(material, frontFaceCW);
			let index = geometry.index;
			let rangeFactor = 1;
			if (material.wireframe === true) {
				index = geometries.getWireframeAttribute(geometry);
				if (index === void 0) return;
				rangeFactor = 2;
			}
			const drawRange = geometry.drawRange;
			const position = geometry.attributes.position;
			let drawStart = drawRange.start * rangeFactor;
			let drawEnd = (drawRange.start + drawRange.count) * rangeFactor;
			if (group !== null) {
				drawStart = Math.max(drawStart, group.start * rangeFactor);
				drawEnd = Math.min(drawEnd, (group.start + group.count) * rangeFactor);
			}
			if (index !== null) {
				drawStart = Math.max(drawStart, 0);
				drawEnd = Math.min(drawEnd, index.count);
			} else if (position !== void 0 && position !== null) {
				drawStart = Math.max(drawStart, 0);
				drawEnd = Math.min(drawEnd, position.count);
			}
			const drawCount = drawEnd - drawStart;
			if (drawCount < 0 || drawCount === Infinity) return;
			bindingStates.setup(object, material, program, geometry, index);
			let attribute;
			let renderer = bufferRenderer;
			if (index !== null) {
				attribute = attributes.get(index);
				renderer = indexedBufferRenderer;
				renderer.setIndex(attribute);
			}
			if (object.isMesh) {
				if (material.wireframe === true) {
					state.setLineWidth(material.wireframeLinewidth * getTargetPixelRatio());
					renderer.setMode(_gl.LINES);
				} else renderer.setMode(_gl.TRIANGLES);
			} else if (object.isLine) {
				let lineWidth = material.linewidth;
				if (lineWidth === void 0) lineWidth = 1;
				state.setLineWidth(lineWidth * getTargetPixelRatio());
				if (object.isLineSegments) renderer.setMode(_gl.LINES);
				else if (object.isLineLoop) renderer.setMode(_gl.LINE_LOOP);
				else renderer.setMode(_gl.LINE_STRIP);
			} else if (object.isPoints) renderer.setMode(_gl.POINTS);
			else if (object.isSprite) renderer.setMode(_gl.TRIANGLES);
			if (object.isBatchedMesh) {
				if (!extensions.get("WEBGL_multi_draw")) {
					const starts = object._multiDrawStarts;
					const counts = object._multiDrawCounts;
					const drawCount = object._multiDrawCount;
					const bytesPerElement = index ? attributes.get(index).bytesPerElement : 1;
					const uniforms = properties.get(material).currentProgram.getUniforms();
					for (let i = 0; i < drawCount; i++) {
						uniforms.setValue(_gl, "_gl_DrawID", i);
						renderer.render(starts[i] / bytesPerElement, counts[i]);
					}
				} else renderer.renderMultiDraw(object._multiDrawStarts, object._multiDrawCounts, object._multiDrawCount);
			} else if (object.isInstancedMesh) renderer.renderInstances(drawStart, drawCount, object.count);
			else if (geometry.isInstancedBufferGeometry) {
				const maxInstanceCount = geometry._maxInstanceCount !== void 0 ? geometry._maxInstanceCount : Infinity;
				const instanceCount = Math.min(geometry.instanceCount, maxInstanceCount);
				renderer.renderInstances(drawStart, drawCount, instanceCount);
			} else renderer.render(drawStart, drawCount);
		};
		function prepareMaterial(material, scene, camera, object) {
			if (_nodesHandler !== null && material.isNodeMaterial) _nodesHandler.setObject(object, material);
			if (_clippingEnabled === true) clipping.setState(material, camera, false);
			if (material.transparent === true && material.side === 2 && material.forceSinglePass === false) {
				material.side = 1;
				material.needsUpdate = true;
				getProgram(material, scene, object);
				material.side = 0;
				material.needsUpdate = true;
				getProgram(material, scene, object);
				material.side = 2;
			} else getProgram(material, scene, object);
		}
		/**
		* Compiles all materials in the scene with the camera. This is useful to precompile shaders
		* before the first rendering. If you want to add a 3D object to an existing scene, use the third
		* optional parameter for applying the target scene.
		*
		* Note that the (target) scene's lighting and environment must be configured before calling this method.
		*
		* @param {Object3D} scene - The scene or another type of 3D object to precompile.
		* @param {Camera} camera - The camera.
		* @param {?Scene} [targetScene=null] - The target scene.
		* @return {Set<Material>} The precompiled materials.
		*/
		this.compile = function(scene, camera, targetScene = null) {
			if (targetScene === null) targetScene = scene;
			if (_nodesHandler !== null) _nodesHandler.renderStart(scene, camera, targetScene);
			currentRenderState = renderStates.get(targetScene);
			currentRenderState.init(camera);
			renderStateStack.push(currentRenderState);
			targetScene.traverseVisible(function(object) {
				if (object.isLight && object.layers.test(camera.layers)) {
					currentRenderState.pushLight(object);
					if (object.castShadow) currentRenderState.pushShadow(object);
				}
			});
			if (scene !== targetScene) scene.traverseVisible(function(object) {
				if (object.isLight && object.layers.test(camera.layers)) {
					currentRenderState.pushLight(object);
					if (object.castShadow) currentRenderState.pushShadow(object);
				}
			});
			currentRenderState.setupLights();
			if (_nodesHandler !== null) _nodesHandler.updateLights(currentRenderState.state.lightsArray);
			_localClippingEnabled = this.localClippingEnabled;
			_clippingEnabled = clipping.init(this.clippingPlanes, _localClippingEnabled);
			if (_clippingEnabled === true) clipping.setGlobalState(this.clippingPlanes, camera);
			if (_nodesHandler !== null) shadowMap.render(currentRenderState.state.shadowsArray, targetScene, camera);
			const materials = /* @__PURE__ */ new Set();
			scene.traverse(function(object) {
				if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
				const material = object.material;
				if (material) {
					if (Array.isArray(material)) for (let i = 0; i < material.length; i++) {
						const material2 = material[i];
						prepareMaterial(material2, targetScene, camera, object);
						materials.add(material2);
					}
					else {
						prepareMaterial(material, targetScene, camera, object);
						materials.add(material);
					}
				}
			});
			currentRenderState = renderStateStack.pop();
			if (_nodesHandler !== null) _nodesHandler.renderEnd();
			return materials;
		};
		/**
		* Asynchronous version of {@link WebGLRenderer#compile}.
		*
		* This method makes use of the `KHR_parallel_shader_compile` WebGL extension. Hence,
		* it is recommended to use this version of `compile()` whenever possible.
		*
		* @async
		* @param {Object3D} scene - The scene or another type of 3D object to precompile.
		* @param {Camera} camera - The camera.
		* @param {?Scene} [targetScene=null] - The target scene.
		* @return {Promise} A Promise that resolves when the given scene can be rendered without unnecessary stalling due to shader compilation.
		*/
		this.compileAsync = function(scene, camera, targetScene = null) {
			const materials = this.compile(scene, camera, targetScene);
			return new Promise((resolve) => {
				function checkMaterialsReady() {
					materials.forEach(function(material) {
						const program = properties.get(material).currentProgram;
						if (program === void 0 || program.isReady()) materials.delete(material);
					});
					if (materials.size === 0) {
						resolve(scene);
						return;
					}
					setTimeout(checkMaterialsReady, 10);
				}
				if (extensions.get("KHR_parallel_shader_compile") !== null) checkMaterialsReady();
				else setTimeout(checkMaterialsReady, 10);
			});
		};
		let onAnimationFrameCallback = null;
		function onAnimationFrame(time) {
			if (onAnimationFrameCallback) onAnimationFrameCallback(time);
		}
		function onXRSessionStart() {
			animation.stop();
		}
		function onXRSessionEnd() {
			animation.start();
		}
		const animation = new WebGLAnimation();
		animation.setAnimationLoop(onAnimationFrame);
		if (typeof self !== "undefined") animation.setContext(self);
		/**
		* Applications are advised to always define the animation loop
		* with this method and not manually with `requestAnimationFrame()`
		* for best compatibility.
		*
		* @param {?onAnimationCallback} callback - The application's animation loop.
		*/
		this.setAnimationLoop = function(callback) {
			onAnimationFrameCallback = callback;
			xr.setAnimationLoop(callback);
			callback === null ? animation.stop() : animation.start();
		};
		xr.addEventListener("sessionstart", onXRSessionStart);
		xr.addEventListener("sessionend", onXRSessionEnd);
		/**
		* Renders the given scene (or other type of 3D object) using the given camera.
		*
		* The render is done to a previously specified render target set by calling {@link WebGLRenderer#setRenderTarget}
		* or to the canvas as usual.
		*
		* By default render buffers are cleared before rendering but you can prevent
		* this by setting the property `autoClear` to `false`. If you want to prevent
		* only certain buffers being cleared you can `autoClearColor`, `autoClearDepth`
		* or `autoClearStencil` to `false`. To force a clear, use {@link WebGLRenderer#clear}.
		*
		* @param {Object3D} scene - The scene to render.
		* @param {Camera} camera - The camera.
		*/
		this.render = function(scene, camera) {
			if (camera !== void 0 && camera.isCamera !== true) {
				error("WebGLRenderer.render: camera is not an instance of THREE.Camera.");
				return;
			}
			if (_isContextLost === true) return;
			if (_nodesHandler !== null) _nodesHandler.renderStart(scene, camera);
			const isXRPresenting = xr.enabled === true && xr.isPresenting === true;
			const useOutput = output !== null && (_currentRenderTarget === null || isXRPresenting) && output.begin(_this, _currentRenderTarget);
			if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
			if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
			if (xr.enabled === true && xr.isPresenting === true && (output === null || output.isCompositing() === false)) {
				if (xr.cameraAutoUpdate === true) xr.updateCamera(camera);
				camera = xr.getCamera();
			}
			if (scene.isScene === true) scene.onBeforeRender(_this, scene, camera, _currentRenderTarget);
			currentRenderState = renderStates.get(scene, renderStateStack.length);
			currentRenderState.init(camera);
			currentRenderState.state.textureUnits = textures.getTextureUnits();
			renderStateStack.push(currentRenderState);
			_projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
			_frustum.setFromProjectionMatrix(_projScreenMatrix, WebGLCoordinateSystem, camera.reversedDepth);
			_localClippingEnabled = this.localClippingEnabled;
			_clippingEnabled = clipping.init(this.clippingPlanes, _localClippingEnabled);
			currentRenderList = renderLists.get(scene, renderListStack.length);
			currentRenderList.init();
			renderListStack.push(currentRenderList);
			if (xr.enabled === true && xr.isPresenting === true) {
				const depthSensingMesh = _this.xr.getDepthSensingMesh();
				if (depthSensingMesh !== null) projectObject(depthSensingMesh, camera, -Infinity, _this.sortObjects);
			}
			projectObject(scene, camera, 0, _this.sortObjects);
			currentRenderList.finish();
			if (_nodesHandler !== null) _nodesHandler.updateLights(currentRenderState.state.lightsArray);
			if (_this.sortObjects === true) currentRenderList.sort(_opaqueSort, _transparentSort);
			_renderBackground = xr.enabled === false || xr.isPresenting === false || xr.hasDepthSensing() === false;
			if (_renderBackground) background.addToRenderList(currentRenderList, scene);
			this.info.render.frame++;
			if (this.info.autoReset === true) this.info.reset();
			if (_clippingEnabled === true) clipping.beginShadows();
			const shadowsArray = currentRenderState.state.shadowsArray;
			shadowMap.render(shadowsArray, scene, camera);
			if (_clippingEnabled === true) clipping.endShadows();
			if ((useOutput && output.hasRenderPass()) === false) {
				const opaqueObjects = currentRenderList.opaque;
				const transmissiveObjects = currentRenderList.transmissive;
				currentRenderState.setupLights();
				if (camera.isArrayCamera) {
					const cameras = camera.cameras;
					if (transmissiveObjects.length > 0) for (let i = 0, l = cameras.length; i < l; i++) {
						const camera2 = cameras[i];
						renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera2);
					}
					if (_renderBackground) background.render(scene);
					for (let i = 0, l = cameras.length; i < l; i++) {
						const camera2 = cameras[i];
						renderScene(currentRenderList, scene, camera2, camera2.viewport);
					}
				} else {
					if (transmissiveObjects.length > 0) renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera);
					if (_renderBackground) background.render(scene);
					renderScene(currentRenderList, scene, camera);
				}
			}
			if (_currentRenderTarget !== null && _currentActiveMipmapLevel === 0) {
				textures.updateMultisampleRenderTarget(_currentRenderTarget);
				textures.updateRenderTargetMipmap(_currentRenderTarget);
			}
			if (useOutput) output.end(_this);
			if (scene.isScene === true) scene.onAfterRender(_this, scene, camera);
			bindingStates.resetDefaultState();
			_currentMaterialId = -1;
			_currentCamera = null;
			renderStateStack.pop();
			if (renderStateStack.length > 0) {
				currentRenderState = renderStateStack[renderStateStack.length - 1];
				textures.setTextureUnits(currentRenderState.state.textureUnits);
				if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, currentRenderState.state.camera);
			} else currentRenderState = null;
			renderListStack.pop();
			if (renderListStack.length > 0) currentRenderList = renderListStack[renderListStack.length - 1];
			else currentRenderList = null;
			if (_nodesHandler !== null) _nodesHandler.renderEnd();
		};
		function projectObject(object, camera, groupOrder, sortObjects) {
			if (object.visible === false) return;
			if (object.layers.test(camera.layers)) {
				if (object.isGroup) groupOrder = object.renderOrder;
				else if (object.isLOD) {
					if (object.autoUpdate === true) object.update(camera);
				} else if (object.isLightProbeGrid) currentRenderState.pushLightProbeGrid(object);
				else if (object.isLight) {
					currentRenderState.pushLight(object);
					if (object.castShadow) currentRenderState.pushShadow(object);
				} else if (object.isSprite) {
					if (!object.frustumCulled || object.intersectsFrustum(_frustum)) {
						if (sortObjects) _vector4.setFromMatrixPosition(object.matrixWorld).applyMatrix4(_projScreenMatrix);
						const geometry = objects.update(object);
						const material = object.material;
						if (material.visible) currentRenderList.push(object, geometry, material, groupOrder, _vector4.z, null, camera);
					}
				} else if (object.isMesh || object.isLine || object.isPoints) {
					if (!object.frustumCulled || object.intersectsFrustum(_frustum)) {
						const geometry = objects.update(object);
						const material = object.material;
						if (sortObjects) {
							if (object.boundingSphere !== void 0) {
								if (object.boundingSphere === null) object.computeBoundingSphere();
								_vector4.copy(object.boundingSphere.center);
							} else {
								if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
								_vector4.copy(geometry.boundingSphere.center);
							}
							_vector4.applyMatrix4(object.matrixWorld).applyMatrix4(_projScreenMatrix);
						}
						if (Array.isArray(material)) {
							const groups = geometry.groups;
							for (let i = 0, l = groups.length; i < l; i++) {
								const group = groups[i];
								const groupMaterial = material[group.materialIndex];
								if (groupMaterial && groupMaterial.visible) currentRenderList.push(object, geometry, groupMaterial, groupOrder, _vector4.z, group, camera);
							}
						} else if (material.visible) currentRenderList.push(object, geometry, material, groupOrder, _vector4.z, null, camera);
					}
				}
			}
			const children = object.children;
			for (let i = 0, l = children.length; i < l; i++) projectObject(children[i], camera, groupOrder, sortObjects);
		}
		function renderScene(currentRenderList, scene, camera, viewport) {
			const { opaque: opaqueObjects, transmissive: transmissiveObjects, transparent: transparentObjects } = currentRenderList;
			currentRenderState.setupLightsView(camera);
			if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, camera);
			if (viewport) state.viewport(_currentViewport.copy(viewport));
			if (opaqueObjects.length > 0) renderObjects(opaqueObjects, scene, camera);
			if (transmissiveObjects.length > 0) renderObjects(transmissiveObjects, scene, camera);
			if (transparentObjects.length > 0) renderObjects(transparentObjects, scene, camera);
			state.buffers.depth.setTest(true);
			state.buffers.depth.setMask(true);
			state.buffers.color.setMask(true);
			state.setPolygonOffset(false);
		}
		function renderTransmissionPass(opaqueObjects, transmissiveObjects, scene, camera) {
			if ((scene.isScene === true ? scene.overrideMaterial : null) !== null) return;
			if (currentRenderState.state.transmissionRenderTarget[camera.id] === void 0) {
				const hasHalfFloatSupport = extensions.has("EXT_color_buffer_half_float") || extensions.has("EXT_color_buffer_float");
				currentRenderState.state.transmissionRenderTarget[camera.id] = new WebGLRenderTarget(1, 1, {
					generateMipmaps: true,
					type: hasHalfFloatSupport ? HalfFloatType : UnsignedByteType,
					minFilter: LinearMipmapLinearFilter,
					samples: Math.max(4, capabilities.samples),
					stencilBuffer: stencil,
					resolveDepthBuffer: false,
					resolveStencilBuffer: false,
					storeMultisampledDepthBuffer: false,
					storeMultisampledStencilBuffer: false,
					colorSpace: ColorManagement.workingColorSpace
				});
			}
			const transmissionRenderTarget = currentRenderState.state.transmissionRenderTarget[camera.id];
			const activeViewport = camera.viewport || _currentViewport;
			transmissionRenderTarget.setSize(activeViewport.z * _this.transmissionResolutionScale, activeViewport.w * _this.transmissionResolutionScale);
			const currentRenderTarget = _this.getRenderTarget();
			const currentActiveCubeFace = _this.getActiveCubeFace();
			const currentActiveMipmapLevel = _this.getActiveMipmapLevel();
			_this.setRenderTarget(transmissionRenderTarget);
			_this.getClearColor(_currentClearColor);
			_currentClearAlpha = _this.getClearAlpha();
			if (_currentClearAlpha < 1) _this.setClearColor(16777215, .5);
			_this.clear();
			if (_renderBackground) background.render(scene);
			const currentToneMapping = _this.toneMapping;
			_this.toneMapping = 0;
			const currentCameraViewport = camera.viewport;
			if (camera.viewport !== void 0) camera.viewport = void 0;
			currentRenderState.setupLightsView(camera);
			if (_clippingEnabled === true) clipping.setGlobalState(_this.clippingPlanes, camera);
			renderObjects(opaqueObjects, scene, camera);
			textures.updateMultisampleRenderTarget(transmissionRenderTarget);
			textures.updateRenderTargetMipmap(transmissionRenderTarget);
			if (extensions.has("WEBGL_multisampled_render_to_texture") === false) {
				let renderTargetNeedsUpdate = false;
				for (let i = 0, l = transmissiveObjects.length; i < l; i++) {
					const { object, geometry, material, group } = transmissiveObjects[i];
					if (material.side === 2 && object.layers.test(camera.layers)) {
						const currentSide = material.side;
						material.side = 1;
						material.needsUpdate = true;
						renderObject(object, scene, camera, geometry, material, group);
						material.side = currentSide;
						material.needsUpdate = true;
						renderTargetNeedsUpdate = true;
					}
				}
				if (renderTargetNeedsUpdate === true) {
					textures.updateMultisampleRenderTarget(transmissionRenderTarget);
					textures.updateRenderTargetMipmap(transmissionRenderTarget);
				}
			}
			_this.setRenderTarget(currentRenderTarget, currentActiveCubeFace, currentActiveMipmapLevel);
			_this.setClearColor(_currentClearColor, _currentClearAlpha);
			if (currentCameraViewport !== void 0) camera.viewport = currentCameraViewport;
			_this.toneMapping = currentToneMapping;
		}
		function renderObjects(renderList, scene, camera) {
			const overrideMaterial = scene.isScene === true ? scene.overrideMaterial : null;
			for (let i = 0, l = renderList.length; i < l; i++) {
				const renderItem = renderList[i];
				const { object, geometry, group } = renderItem;
				let material = renderItem.material;
				if (material.allowOverride === true && overrideMaterial !== null) material = overrideMaterial;
				if (object.layers.test(camera.layers)) renderObject(object, scene, camera, geometry, material, group);
			}
		}
		function renderObject(object, scene, camera, geometry, material, group) {
			if (_nodesHandler !== null && material.isNodeMaterial) _nodesHandler.setObject(object, material);
			object.onBeforeRender(_this, scene, camera, geometry, material, group);
			object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
			object.normalMatrix.getNormalMatrix(object.modelViewMatrix);
			material.onBeforeRender(_this, scene, camera, geometry, object, group);
			if (material.transparent === true && material.side === 2 && material.forceSinglePass === false) {
				material.side = 1;
				material.needsUpdate = true;
				_this.renderBufferDirect(camera, scene, geometry, material, object, group);
				material.side = 0;
				material.needsUpdate = true;
				_this.renderBufferDirect(camera, scene, geometry, material, object, group);
				material.side = 2;
			} else _this.renderBufferDirect(camera, scene, geometry, material, object, group);
			object.onAfterRender(_this, scene, camera, geometry, material, group);
		}
		function getProgram(material, scene, object) {
			if (scene.isScene !== true) scene = _emptyScene;
			const materialProperties = properties.get(material);
			const lights = currentRenderState.state.lights;
			const shadowsArray = currentRenderState.state.shadowsArray;
			const lightsStateVersion = lights.state.version;
			const parameters = programCache.getParameters(material, lights.state, shadowsArray, scene, object, currentRenderState.state.lightProbeGridArray);
			const programCacheKey = programCache.getProgramCacheKey(parameters);
			let programs = materialProperties.programs;
			materialProperties.environment = material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial ? scene.environment : null;
			materialProperties.fog = scene.fog;
			const usePMREM = material.isMeshStandardMaterial || material.isMeshLambertMaterial && !material.envMap || material.isMeshPhongMaterial && !material.envMap;
			materialProperties.envMap = environments.get(material.envMap || materialProperties.environment, usePMREM);
			materialProperties.envMapRotation = materialProperties.environment !== null && material.envMap === null ? scene.environmentRotation : material.envMapRotation;
			if (programs === void 0) {
				material.addEventListener("dispose", onMaterialDispose);
				programs = /* @__PURE__ */ new Map();
				materialProperties.programs = programs;
			}
			let program = programs.get(programCacheKey);
			if (program !== void 0) {
				if (materialProperties.currentProgram === program && materialProperties.lightsStateVersion === lightsStateVersion) {
					updateCommonMaterialProperties(material, parameters);
					return program;
				}
			} else {
				parameters.uniforms = programCache.getUniforms(material);
				if (_nodesHandler !== null && material.isNodeMaterial) _nodesHandler.build(material, object, parameters);
				material.onBeforeCompile(parameters, _this);
				program = programCache.acquireProgram(parameters, programCacheKey);
				programs.set(programCacheKey, program);
				materialProperties.uniforms = parameters.uniforms;
			}
			const uniforms = materialProperties.uniforms;
			if (!material.isShaderMaterial && !material.isRawShaderMaterial || material.clipping === true) uniforms.clippingPlanes = clipping.uniform;
			updateCommonMaterialProperties(material, parameters);
			materialProperties.needsLights = materialNeedsLights(material);
			materialProperties.lightsStateVersion = lightsStateVersion;
			if (materialProperties.needsLights) {
				uniforms.ambientLightColor.value = lights.state.ambient;
				uniforms.lightProbe.value = lights.state.probe;
				uniforms.sunLights.value = lights.state.sun;
				uniforms.sunLightShadows.value = lights.state.sunShadow;
				uniforms.directionalLights.value = lights.state.directional;
				uniforms.directionalLightShadows.value = lights.state.directionalShadow;
				uniforms.spotLights.value = lights.state.spot;
				uniforms.spotLightShadows.value = lights.state.spotShadow;
				uniforms.rectAreaLights.value = lights.state.rectArea;
				uniforms.ltc_1.value = lights.state.rectAreaLTC1;
				uniforms.ltc_2.value = lights.state.rectAreaLTC2;
				uniforms.pointLights.value = lights.state.point;
				uniforms.pointLightShadows.value = lights.state.pointShadow;
				uniforms.hemisphereLights.value = lights.state.hemi;
				uniforms.sunShadowMatrix.value = lights.state.sunShadowMatrix;
				uniforms.sunShadowCascade.value = lights.state.sunShadowCascade;
				uniforms.directionalShadowMatrix.value = lights.state.directionalShadowMatrix;
				uniforms.spotLightMatrix.value = lights.state.spotLightMatrix;
				uniforms.spotLightMap.value = lights.state.spotLightMap;
				uniforms.pointShadowMatrix.value = lights.state.pointShadowMatrix;
			}
			materialProperties.lightProbeGrid = currentRenderState.state.lightProbeGridArray.length > 0;
			materialProperties.currentProgram = program;
			materialProperties.uniformsList = null;
			return program;
		}
		function getUniformList(materialProperties) {
			if (materialProperties.uniformsList === null) {
				const progUniforms = materialProperties.currentProgram.getUniforms();
				materialProperties.uniformsList = WebGLUniforms.seqWithValue(progUniforms.seq, materialProperties.uniforms);
			}
			return materialProperties.uniformsList;
		}
		function updateCommonMaterialProperties(material, parameters) {
			const materialProperties = properties.get(material);
			materialProperties.outputColorSpace = parameters.outputColorSpace;
			materialProperties.batching = parameters.batching;
			materialProperties.batchingColor = parameters.batchingColor;
			materialProperties.instancing = parameters.instancing;
			materialProperties.instancingColor = parameters.instancingColor;
			materialProperties.instancingMorph = parameters.instancingMorph;
			materialProperties.skinning = parameters.skinning;
			materialProperties.morphTargets = parameters.morphTargets;
			materialProperties.morphNormals = parameters.morphNormals;
			materialProperties.morphColors = parameters.morphColors;
			materialProperties.morphTargetsCount = parameters.morphTargetsCount;
			materialProperties.numClippingPlanes = parameters.numClippingPlanes;
			materialProperties.numIntersection = parameters.numClipIntersection;
			materialProperties.vertexAlphas = parameters.vertexAlphas;
			materialProperties.vertexTangents = parameters.vertexTangents;
			materialProperties.toneMapping = parameters.toneMapping;
		}
		function findLightProbeGrid(volumes, object) {
			if (volumes.length === 0) return null;
			if (volumes.length === 1) return volumes[0].texture !== null ? volumes[0] : null;
			objectPosition.setFromMatrixPosition(object.matrixWorld);
			for (let i = 0, l = volumes.length; i < l; i++) {
				const v = volumes[i];
				if (v.texture !== null && v.boundingBox.containsPoint(objectPosition)) return v;
			}
			return null;
		}
		function setProgram(camera, scene, geometry, material, object) {
			if (scene.isScene !== true) scene = _emptyScene;
			textures.resetTextureUnits();
			const fog = scene.fog;
			const environment = material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial ? scene.environment : null;
			const colorSpace = _currentRenderTarget === null ? _this.outputColorSpace : _currentRenderTarget.isXRRenderTarget === true ? _currentRenderTarget.texture.colorSpace : ColorManagement.workingColorSpace;
			const usePMREM = material.isMeshStandardMaterial || material.isMeshLambertMaterial && !material.envMap || material.isMeshPhongMaterial && !material.envMap;
			const envMap = environments.get(material.envMap || environment, usePMREM);
			const vertexAlphas = material.vertexColors === true && !!geometry.attributes.color && geometry.attributes.color.itemSize === 4;
			const vertexTangents = !!geometry.attributes.tangent && (!!material.normalMap || material.anisotropy > 0);
			const morphTargets = !!geometry.morphAttributes.position;
			const morphNormals = !!geometry.morphAttributes.normal;
			const morphColors = !!geometry.morphAttributes.color;
			let toneMapping = 0;
			if (material.toneMapped) {
				if (_currentRenderTarget === null || _currentRenderTarget.isXRRenderTarget === true) toneMapping = _this.toneMapping;
			}
			const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
			const morphTargetsCount = morphAttribute !== void 0 ? morphAttribute.length : 0;
			const materialProperties = properties.get(material);
			const lights = currentRenderState.state.lights;
			if (_clippingEnabled === true) {
				if (_localClippingEnabled === true || camera !== _currentCamera) {
					const useCache = camera === _currentCamera && material.id === _currentMaterialId;
					clipping.setState(material, camera, useCache);
				}
			}
			let needsProgramChange = false;
			if (material.version === materialProperties.__version) {
				if (materialProperties.needsLights && materialProperties.lightsStateVersion !== lights.state.version) needsProgramChange = true;
				else if (materialProperties.outputColorSpace !== colorSpace) needsProgramChange = true;
				else if (object.isBatchedMesh && materialProperties.batching === false) needsProgramChange = true;
				else if (!object.isBatchedMesh && materialProperties.batching === true) needsProgramChange = true;
				else if (object.isBatchedMesh && materialProperties.batchingColor === true && object._colorsTexture === null) needsProgramChange = true;
				else if (object.isBatchedMesh && materialProperties.batchingColor === false && object._colorsTexture !== null) needsProgramChange = true;
				else if (object.isInstancedMesh && materialProperties.instancing === false) needsProgramChange = true;
				else if (!object.isInstancedMesh && materialProperties.instancing === true) needsProgramChange = true;
				else if (object.isSkinnedMesh && materialProperties.skinning === false) needsProgramChange = true;
				else if (!object.isSkinnedMesh && materialProperties.skinning === true) needsProgramChange = true;
				else if (object.isInstancedMesh && materialProperties.instancingColor === true && object.instanceColor === null) needsProgramChange = true;
				else if (object.isInstancedMesh && materialProperties.instancingColor === false && object.instanceColor !== null) needsProgramChange = true;
				else if (object.isInstancedMesh && materialProperties.instancingMorph === true && object.morphTexture === null) needsProgramChange = true;
				else if (object.isInstancedMesh && materialProperties.instancingMorph === false && object.morphTexture !== null) needsProgramChange = true;
				else if (materialProperties.envMap !== envMap) needsProgramChange = true;
				else if (material.fog === true && materialProperties.fog !== fog) needsProgramChange = true;
				else if (materialProperties.numClippingPlanes !== void 0 && (materialProperties.numClippingPlanes !== clipping.numPlanes || materialProperties.numIntersection !== clipping.numIntersection)) needsProgramChange = true;
				else if (materialProperties.vertexAlphas !== vertexAlphas) needsProgramChange = true;
				else if (materialProperties.vertexTangents !== vertexTangents) needsProgramChange = true;
				else if (materialProperties.morphTargets !== morphTargets) needsProgramChange = true;
				else if (materialProperties.morphNormals !== morphNormals) needsProgramChange = true;
				else if (materialProperties.morphColors !== morphColors) needsProgramChange = true;
				else if (materialProperties.toneMapping !== toneMapping) needsProgramChange = true;
				else if (materialProperties.morphTargetsCount !== morphTargetsCount) needsProgramChange = true;
				else if (!!materialProperties.lightProbeGrid !== currentRenderState.state.lightProbeGridArray.length > 0) needsProgramChange = true;
			} else {
				needsProgramChange = true;
				materialProperties.__version = material.version;
			}
			let program = materialProperties.currentProgram;
			if (needsProgramChange === true) {
				program = getProgram(material, scene, object);
				if (_nodesHandler && material.isNodeMaterial) _nodesHandler.onUpdateProgram(material, program, materialProperties);
			}
			let refreshProgram = false;
			let refreshMaterial = false;
			let refreshLights = false;
			const p_uniforms = program.getUniforms(), m_uniforms = materialProperties.uniforms;
			if (state.useProgram(program.program)) {
				refreshProgram = true;
				refreshMaterial = true;
				refreshLights = true;
			}
			if (material.id !== _currentMaterialId) {
				_currentMaterialId = material.id;
				refreshMaterial = true;
			}
			if (materialProperties.needsLights) {
				const objectVolume = findLightProbeGrid(currentRenderState.state.lightProbeGridArray, object);
				if (materialProperties.lightProbeGrid !== objectVolume) {
					materialProperties.lightProbeGrid = objectVolume;
					refreshMaterial = true;
				}
			}
			if (refreshProgram || _currentCamera !== camera) {
				if (state.buffers.depth.getReversed() && camera.reversedDepth !== true) {
					camera._reversedDepth = true;
					camera.updateProjectionMatrix();
				}
				p_uniforms.setValue(_gl, "projectionMatrix", camera.projectionMatrix);
				p_uniforms.setValue(_gl, "viewMatrix", camera.matrixWorldInverse);
				const uCamPos = p_uniforms.map.cameraPosition;
				if (uCamPos !== void 0) uCamPos.setValue(_gl, _vector3.setFromMatrixPosition(camera.matrixWorld));
				if (capabilities.logarithmicDepthBuffer) p_uniforms.setValue(_gl, "logDepthBufFC", 2 / (Math.log(camera.far + 1) / Math.LN2));
				if (material.isMeshPhongMaterial || material.isMeshToonMaterial || material.isMeshLambertMaterial || material.isMeshBasicMaterial || material.isMeshStandardMaterial || material.isShaderMaterial) p_uniforms.setValue(_gl, "isOrthographic", camera.isOrthographicCamera === true);
				if (_currentCamera !== camera) {
					_currentCamera = camera;
					refreshMaterial = true;
					refreshLights = true;
				}
			}
			if (materialProperties.needsLights) {
				if (lights.state.sunShadowMap.length > 0) p_uniforms.setValue(_gl, "sunShadowMap", lights.state.sunShadowMap, textures);
				if (lights.state.directionalShadowMap.length > 0) p_uniforms.setValue(_gl, "directionalShadowMap", lights.state.directionalShadowMap, textures);
				if (lights.state.spotShadowMap.length > 0) p_uniforms.setValue(_gl, "spotShadowMap", lights.state.spotShadowMap, textures);
				if (lights.state.pointShadowMap.length > 0) p_uniforms.setValue(_gl, "pointShadowMap", lights.state.pointShadowMap, textures);
			}
			if (object.isSkinnedMesh) {
				p_uniforms.setOptional(_gl, object, "bindMatrix");
				p_uniforms.setOptional(_gl, object, "bindMatrixInverse");
				const skeleton = object.skeleton;
				if (skeleton) {
					if (skeleton.boneTexture === null) skeleton.computeBoneTexture();
					p_uniforms.setValue(_gl, "boneTexture", skeleton.boneTexture, textures);
				}
			}
			if (object.isBatchedMesh) {
				p_uniforms.setOptional(_gl, object, "batchingTexture");
				p_uniforms.setValue(_gl, "batchingTexture", object._matricesTexture, textures);
				p_uniforms.setOptional(_gl, object, "batchingIdTexture");
				p_uniforms.setValue(_gl, "batchingIdTexture", object._indirectTexture, textures);
				p_uniforms.setOptional(_gl, object, "batchingColorTexture");
				if (object._colorsTexture !== null) p_uniforms.setValue(_gl, "batchingColorTexture", object._colorsTexture, textures);
			}
			const morphAttributes = geometry.morphAttributes;
			if (morphAttributes.position !== void 0 || morphAttributes.normal !== void 0 || morphAttributes.color !== void 0) morphtargets.update(object, geometry, program);
			if (refreshMaterial || materialProperties.receiveShadow !== object.receiveShadow) {
				materialProperties.receiveShadow = object.receiveShadow;
				p_uniforms.setValue(_gl, "receiveShadow", object.receiveShadow);
			}
			if ((material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial) && material.envMap === null && scene.environment !== null) m_uniforms.envMapIntensity.value = scene.environmentIntensity;
			if (m_uniforms.dfgLUT !== void 0) m_uniforms.dfgLUT.value = getDFGLUT();
			if (refreshMaterial) {
				p_uniforms.setValue(_gl, "toneMappingExposure", _this.toneMappingExposure);
				if (materialProperties.needsLights) markUniformsLightsNeedsUpdate(m_uniforms, refreshLights);
				if (fog && material.fog === true) materials.refreshFogUniforms(m_uniforms, fog);
				materials.refreshMaterialUniforms(m_uniforms, material, _pixelRatio, _height, currentRenderState.state.transmissionRenderTarget[camera.id]);
				if (materialProperties.needsLights && materialProperties.lightProbeGrid) {
					const volume = materialProperties.lightProbeGrid;
					m_uniforms.probesSH.value = volume.texture;
					m_uniforms.probesMin.value.copy(volume.boundingBox.min);
					m_uniforms.probesMax.value.copy(volume.boundingBox.max);
					m_uniforms.probesResolution.value.copy(volume.resolution);
				}
				WebGLUniforms.upload(_gl, getUniformList(materialProperties), m_uniforms, textures);
			}
			if (material.isShaderMaterial && material.uniformsNeedUpdate === true) {
				WebGLUniforms.upload(_gl, getUniformList(materialProperties), m_uniforms, textures);
				material.uniformsNeedUpdate = false;
			}
			if (material.isSpriteMaterial) p_uniforms.setValue(_gl, "center", object.center);
			p_uniforms.setValue(_gl, "modelViewMatrix", object.modelViewMatrix);
			p_uniforms.setValue(_gl, "normalMatrix", object.normalMatrix);
			p_uniforms.setValue(_gl, "modelMatrix", object.matrixWorld);
			if (material.uniformsGroups !== void 0) {
				const groups = material.uniformsGroups;
				for (let i = 0, l = groups.length; i < l; i++) {
					const group = groups[i];
					uniformsGroups.update(group, program);
					uniformsGroups.bind(group, program);
				}
			}
			return program;
		}
		function markUniformsLightsNeedsUpdate(uniforms, value) {
			uniforms.ambientLightColor.needsUpdate = value;
			uniforms.lightProbe.needsUpdate = value;
			uniforms.sunLights.needsUpdate = value;
			uniforms.sunLightShadows.needsUpdate = value;
			uniforms.directionalLights.needsUpdate = value;
			uniforms.directionalLightShadows.needsUpdate = value;
			uniforms.pointLights.needsUpdate = value;
			uniforms.pointLightShadows.needsUpdate = value;
			uniforms.spotLights.needsUpdate = value;
			uniforms.spotLightShadows.needsUpdate = value;
			uniforms.rectAreaLights.needsUpdate = value;
			uniforms.hemisphereLights.needsUpdate = value;
		}
		function materialNeedsLights(material) {
			return material.isMeshLambertMaterial || material.isMeshToonMaterial || material.isMeshPhongMaterial || material.isMeshStandardMaterial || material.isShadowMaterial || material.isShaderMaterial && material.lights === true;
		}
		/**
		* Returns the active cube face.
		*
		* @return {number} The active cube face.
		*/
		this.getActiveCubeFace = function() {
			return _currentActiveCubeFace;
		};
		/**
		* Returns the active mipmap level.
		*
		* @return {number} The active mipmap level.
		*/
		this.getActiveMipmapLevel = function() {
			return _currentActiveMipmapLevel;
		};
		/**
		* Returns the active render target.
		*
		* @return {?WebGLRenderTarget} The active render target. Returns `null` if no render target
		* is currently set.
		*/
		this.getRenderTarget = function() {
			return _currentRenderTarget;
		};
		this.setRenderTargetTextures = function(renderTarget, colorTexture, depthTexture) {
			const renderTargetProperties = properties.get(renderTarget);
			renderTargetProperties.__autoAllocateDepthBuffer = renderTarget.resolveDepthBuffer === false;
			if (renderTargetProperties.__autoAllocateDepthBuffer === false) renderTargetProperties.__useRenderToTexture = false;
			properties.get(renderTarget.texture).__webglTexture = colorTexture;
			properties.get(renderTarget.depthTexture).__webglTexture = renderTargetProperties.__autoAllocateDepthBuffer ? void 0 : depthTexture;
			renderTargetProperties.__hasExternalTextures = true;
		};
		this.setRenderTargetFramebuffer = function(renderTarget, defaultFramebuffer) {
			const renderTargetProperties = properties.get(renderTarget);
			renderTargetProperties.__webglFramebuffer = defaultFramebuffer;
			renderTargetProperties.__useDefaultFramebuffer = defaultFramebuffer === void 0;
		};
		/**
		* Sets the active rendertarget.
		*
		* @param {?WebGLRenderTarget} renderTarget - The render target to set. When `null` is given,
		* the canvas is set as the active render target instead.
		* @param {number} [activeCubeFace=0] - The active cube face when using a cube render target.
		* Indicates the z layer to render in to when using 3D or array render targets.
		* @param {number} [activeMipmapLevel=0] - The active mipmap level.
		*/
		this.setRenderTarget = function(renderTarget, activeCubeFace = 0, activeMipmapLevel = 0) {
			_currentRenderTarget = renderTarget;
			_currentActiveCubeFace = activeCubeFace;
			_currentActiveMipmapLevel = activeMipmapLevel;
			let framebuffer = null;
			let isCube = false;
			let isRenderTarget3D = false;
			if (renderTarget) {
				const renderTargetProperties = properties.get(renderTarget);
				if (renderTargetProperties.__useDefaultFramebuffer !== void 0) {
					state.bindFramebuffer(_gl.FRAMEBUFFER, renderTargetProperties.__webglFramebuffer);
					_currentViewport.copy(renderTarget.viewport);
					_currentScissor.copy(renderTarget.scissor);
					_currentScissorTest = renderTarget.scissorTest;
					state.viewport(_currentViewport);
					state.scissor(_currentScissor);
					state.setScissorTest(_currentScissorTest);
					_currentMaterialId = -1;
					return;
				} else if (renderTargetProperties.__webglFramebuffer === void 0) textures.setupRenderTarget(renderTarget);
				else if (renderTargetProperties.__hasExternalTextures) textures.rebindTextures(renderTarget, properties.get(renderTarget.texture).__webglTexture, properties.get(renderTarget.depthTexture).__webglTexture);
				else if (renderTarget.depthBuffer) {
					const depthTexture = renderTarget.depthTexture;
					if (renderTargetProperties.__boundDepthTexture !== depthTexture) {
						if (depthTexture !== null && properties.has(depthTexture) && (renderTarget.width !== depthTexture.image.width || renderTarget.height !== depthTexture.image.height)) throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");
						textures.setupDepthRenderbuffer(renderTarget);
					}
				}
				const texture = renderTarget.texture;
				if (texture.isData3DTexture || texture.isDataArrayTexture || texture.isCompressedArrayTexture) isRenderTarget3D = true;
				const __webglFramebuffer = properties.get(renderTarget).__webglFramebuffer;
				if (renderTarget.isWebGLCubeRenderTarget) {
					if (Array.isArray(__webglFramebuffer[activeCubeFace])) framebuffer = __webglFramebuffer[activeCubeFace][activeMipmapLevel];
					else framebuffer = __webglFramebuffer[activeCubeFace];
					isCube = true;
				} else if (renderTarget.samples > 0 && textures.useMultisampledRTT(renderTarget) === false) framebuffer = properties.get(renderTarget).__webglMultisampledFramebuffer;
				else if (Array.isArray(__webglFramebuffer)) framebuffer = __webglFramebuffer[activeMipmapLevel];
				else framebuffer = __webglFramebuffer;
				_currentViewport.copy(renderTarget.viewport);
				_currentScissor.copy(renderTarget.scissor);
				_currentScissorTest = renderTarget.scissorTest;
			} else {
				_currentViewport.copy(_viewport).multiplyScalar(_pixelRatio).floor();
				_currentScissor.copy(_scissor).multiplyScalar(_pixelRatio).floor();
				_currentScissorTest = _scissorTest;
			}
			if (activeMipmapLevel !== 0) framebuffer = _scratchFramebuffer;
			if (state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer)) state.drawBuffers(renderTarget, framebuffer);
			state.viewport(_currentViewport);
			state.scissor(_currentScissor);
			state.setScissorTest(_currentScissorTest);
			if (isCube) {
				const textureProperties = properties.get(renderTarget.texture);
				_gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_CUBE_MAP_POSITIVE_X + activeCubeFace, textureProperties.__webglTexture, activeMipmapLevel);
			} else if (isRenderTarget3D) {
				const layer = activeCubeFace;
				for (let i = 0; i < renderTarget.textures.length; i++) {
					const textureProperties = properties.get(renderTarget.textures[i]);
					_gl.framebufferTextureLayer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0 + i, textureProperties.__webglTexture, activeMipmapLevel, layer);
				}
			} else if (renderTarget !== null && activeMipmapLevel !== 0) {
				const textureProperties = properties.get(renderTarget.texture);
				_gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, textureProperties.__webglTexture, activeMipmapLevel);
			}
			_currentMaterialId = -1;
		};
		function getReadableState(texture) {
			const textureProperties = properties.get(texture);
			if (textureProperties.__readFormat !== texture.format || textureProperties.__readType !== texture.type) {
				textureProperties.__readFormat = texture.format;
				textureProperties.__readType = texture.type;
				textureProperties.__formatReadable = capabilities.textureFormatReadable(texture.format);
				textureProperties.__typeReadable = capabilities.textureTypeReadable(texture.type);
			}
			return textureProperties;
		}
		/**
		* Reads the pixel data from the given render target into the given buffer.
		*
		* @param {WebGLRenderTarget} renderTarget - The render target to read from.
		* @param {number} x - The `x` coordinate of the copy region's origin.
		* @param {number} y - The `y` coordinate of the copy region's origin.
		* @param {number} width - The width of the copy region.
		* @param {number} height - The height of the copy region.
		* @param {TypedArray} buffer - The result buffer.
		* @param {number} [activeCubeFaceIndex] - The active cube face index.
		* @param {number} [textureIndex=0] - The texture index of an MRT render target.
		*/
		this.readRenderTargetPixels = function(renderTarget, x, y, width, height, buffer, activeCubeFaceIndex, textureIndex = 0) {
			if (!(renderTarget && renderTarget.isWebGLRenderTarget)) {
				error("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
				return;
			}
			let framebuffer = properties.get(renderTarget).__webglFramebuffer;
			if (renderTarget.isWebGLCubeRenderTarget && activeCubeFaceIndex !== void 0) framebuffer = framebuffer[activeCubeFaceIndex];
			if (framebuffer) {
				state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
				try {
					const texture = renderTarget.textures[textureIndex];
					const textureFormat = texture.format;
					const textureType = texture.type;
					if (renderTarget.textures.length > 1) _gl.readBuffer(_gl.COLOR_ATTACHMENT0 + textureIndex);
					const readableState = getReadableState(texture);
					if (readableState.__formatReadable === false) {
						error("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
						return;
					}
					if (readableState.__typeReadable === false) {
						error("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
						return;
					}
					if (x >= 0 && x <= renderTarget.width - width && y >= 0 && y <= renderTarget.height - height) _gl.readPixels(x, y, width, height, utils.convert(textureFormat), utils.convert(textureType), buffer);
				} finally {
					const framebuffer = _currentRenderTarget !== null ? properties.get(_currentRenderTarget).__webglFramebuffer : null;
					state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
				}
			}
		};
		/**
		* Asynchronous, non-blocking version of {@link WebGLRenderer#readRenderTargetPixels}.
		*
		* It is recommended to use this version of `readRenderTargetPixels()` whenever possible.
		*
		* @async
		* @param {WebGLRenderTarget} renderTarget - The render target to read from.
		* @param {number} x - The `x` coordinate of the copy region's origin.
		* @param {number} y - The `y` coordinate of the copy region's origin.
		* @param {number} width - The width of the copy region.
		* @param {number} height - The height of the copy region.
		* @param {TypedArray} buffer - The result buffer.
		* @param {number} [activeCubeFaceIndex] - The active cube face index.
		* @param {number} [textureIndex=0] - The texture index of an MRT render target.
		* @return {Promise<TypedArray>} A Promise that resolves when the read has been finished. The resolve provides the read data as a typed array.
		*/
		this.readRenderTargetPixelsAsync = async function(renderTarget, x, y, width, height, buffer, activeCubeFaceIndex, textureIndex = 0) {
			if (!(renderTarget && renderTarget.isWebGLRenderTarget)) throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
			let framebuffer = properties.get(renderTarget).__webglFramebuffer;
			if (renderTarget.isWebGLCubeRenderTarget && activeCubeFaceIndex !== void 0) framebuffer = framebuffer[activeCubeFaceIndex];
			if (framebuffer) {
				if (x >= 0 && x <= renderTarget.width - width && y >= 0 && y <= renderTarget.height - height) {
					state.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
					const texture = renderTarget.textures[textureIndex];
					const textureFormat = texture.format;
					const textureType = texture.type;
					if (renderTarget.textures.length > 1) _gl.readBuffer(_gl.COLOR_ATTACHMENT0 + textureIndex);
					const readableState = getReadableState(texture);
					if (readableState.__formatReadable === false) throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
					if (readableState.__typeReadable === false) throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
					const glBuffer = _gl.createBuffer();
					_gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, glBuffer);
					_gl.bufferData(_gl.PIXEL_PACK_BUFFER, buffer.byteLength, _gl.STREAM_READ);
					_gl.readPixels(x, y, width, height, utils.convert(textureFormat), utils.convert(textureType), 0);
					_gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, null);
					const currFramebuffer = _currentRenderTarget !== null ? properties.get(_currentRenderTarget).__webglFramebuffer : null;
					state.bindFramebuffer(_gl.FRAMEBUFFER, currFramebuffer);
					const sync = _gl.fenceSync(_gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
					_gl.flush();
					await probeAsync(_gl, sync, 4);
					_gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, glBuffer);
					_gl.getBufferSubData(_gl.PIXEL_PACK_BUFFER, 0, buffer);
					_gl.bindBuffer(_gl.PIXEL_PACK_BUFFER, null);
					_gl.deleteBuffer(glBuffer);
					_gl.deleteSync(sync);
					return buffer;
				} else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
			}
		};
		/**
		* Copies pixels from the current bound framebuffer into the given texture.
		*
		* @param {FramebufferTexture} texture - The texture.
		* @param {?Vector2} [position=null] - The start position of the copy operation.
		* @param {number} [level=0] - The mip level. The default represents the base mip.
		*/
		this.copyFramebufferToTexture = function(texture, position = null, level = 0) {
			const levelScale = Math.pow(2, -level);
			const width = Math.floor(texture.image.width * levelScale);
			const height = Math.floor(texture.image.height * levelScale);
			const x = position !== null ? position.x : 0;
			const y = position !== null ? position.y : 0;
			textures.setTexture2D(texture, 0);
			_gl.copyTexSubImage2D(_gl.TEXTURE_2D, level, 0, 0, x, y, width, height);
			state.unbindTexture();
		};
		/**
		* Copies data of the given source texture into a destination texture.
		*
		* When using render target textures as `srcTexture` and `dstTexture`, you must make sure both render targets are initialized
		* {@link WebGLRenderer#initRenderTarget}.
		*
		* @param {Texture} srcTexture - The source texture.
		* @param {Texture} dstTexture - The destination texture.
		* @param {?(Box2|Box3)} [srcRegion=null] - A bounding box which describes the source region. Can be two or three-dimensional.
		* @param {?(Vector2|Vector3)} [dstPosition=null] - A vector that represents the origin of the destination region. Can be two or three-dimensional.
		* @param {number} [srcLevel=0] - The source mipmap level to copy.
		* @param {?number} [dstLevel=0] - The destination mipmap level.
		*/
		this.copyTextureToTexture = function(srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0) {
			let width, height, depth, minX, minY, minZ;
			let dstX, dstY, dstZ;
			const image = srcTexture.isCompressedTexture ? srcTexture.mipmaps[dstLevel] : srcTexture.image;
			if (srcRegion !== null) {
				width = srcRegion.max.x - srcRegion.min.x;
				height = srcRegion.max.y - srcRegion.min.y;
				depth = srcRegion.isBox3 ? srcRegion.max.z - srcRegion.min.z : 1;
				minX = srcRegion.min.x;
				minY = srcRegion.min.y;
				minZ = srcRegion.isBox3 ? srcRegion.min.z : 0;
			} else {
				const levelScale = Math.pow(2, -srcLevel);
				width = Math.floor(image.width * levelScale);
				height = Math.floor(image.height * levelScale);
				if (srcTexture.isDataArrayTexture) depth = image.depth;
				else if (srcTexture.isData3DTexture) depth = Math.floor(image.depth * levelScale);
				else depth = 1;
				minX = 0;
				minY = 0;
				minZ = 0;
			}
			if (dstPosition !== null) {
				dstX = dstPosition.x;
				dstY = dstPosition.y;
				dstZ = dstPosition.z;
			} else {
				dstX = 0;
				dstY = 0;
				dstZ = 0;
			}
			const glFormat = utils.convert(dstTexture.format);
			const glType = utils.convert(dstTexture.type);
			let glTarget;
			if (dstTexture.isData3DTexture) {
				textures.setTexture3D(dstTexture, 0);
				glTarget = _gl.TEXTURE_3D;
			} else if (dstTexture.isDataArrayTexture || dstTexture.isCompressedArrayTexture) {
				textures.setTexture2DArray(dstTexture, 0);
				glTarget = _gl.TEXTURE_2D_ARRAY;
			} else {
				textures.setTexture2D(dstTexture, 0);
				glTarget = _gl.TEXTURE_2D;
			}
			state.activeTexture(_gl.TEXTURE0);
			state.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, dstTexture.flipY);
			state.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, dstTexture.premultiplyAlpha);
			state.pixelStorei(_gl.UNPACK_ALIGNMENT, dstTexture.unpackAlignment);
			const currentUnpackRowLen = state.getParameter(_gl.UNPACK_ROW_LENGTH);
			const currentUnpackImageHeight = state.getParameter(_gl.UNPACK_IMAGE_HEIGHT);
			const currentUnpackSkipPixels = state.getParameter(_gl.UNPACK_SKIP_PIXELS);
			const currentUnpackSkipRows = state.getParameter(_gl.UNPACK_SKIP_ROWS);
			const currentUnpackSkipImages = state.getParameter(_gl.UNPACK_SKIP_IMAGES);
			state.pixelStorei(_gl.UNPACK_ROW_LENGTH, image.width);
			state.pixelStorei(_gl.UNPACK_IMAGE_HEIGHT, image.height);
			state.pixelStorei(_gl.UNPACK_SKIP_PIXELS, minX);
			state.pixelStorei(_gl.UNPACK_SKIP_ROWS, minY);
			state.pixelStorei(_gl.UNPACK_SKIP_IMAGES, minZ);
			const isSrc3D = srcTexture.isDataArrayTexture || srcTexture.isData3DTexture;
			const isDst3D = dstTexture.isDataArrayTexture || dstTexture.isData3DTexture;
			if (srcTexture.isDepthTexture) {
				const srcTextureProperties = properties.get(srcTexture);
				const dstTextureProperties = properties.get(dstTexture);
				const srcRenderTargetProperties = properties.get(srcTextureProperties.__renderTarget);
				const dstRenderTargetProperties = properties.get(dstTextureProperties.__renderTarget);
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, srcRenderTargetProperties.__webglFramebuffer);
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, dstRenderTargetProperties.__webglFramebuffer);
				for (let i = 0; i < depth; i++) {
					if (isSrc3D) {
						_gl.framebufferTextureLayer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, properties.get(srcTexture).__webglTexture, srcLevel, minZ + i);
						_gl.framebufferTextureLayer(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, properties.get(dstTexture).__webglTexture, dstLevel, dstZ + i);
					}
					_gl.blitFramebuffer(minX, minY, width, height, dstX, dstY, width, height, _gl.DEPTH_BUFFER_BIT, _gl.NEAREST);
				}
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);
			} else if (srcLevel !== 0 || srcTexture.isRenderTargetTexture || properties.has(srcTexture)) {
				const srcTextureProperties = properties.get(srcTexture);
				const dstTextureProperties = properties.get(dstTexture);
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, _srcFramebuffer);
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, _dstFramebuffer);
				for (let i = 0; i < depth; i++) {
					if (isSrc3D) _gl.framebufferTextureLayer(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, srcTextureProperties.__webglTexture, srcLevel, minZ + i);
					else _gl.framebufferTexture2D(_gl.READ_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, srcTextureProperties.__webglTexture, srcLevel);
					if (isDst3D) _gl.framebufferTextureLayer(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, dstTextureProperties.__webglTexture, dstLevel, dstZ + i);
					else _gl.framebufferTexture2D(_gl.DRAW_FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, dstTextureProperties.__webglTexture, dstLevel);
					if (srcLevel !== 0) _gl.blitFramebuffer(minX, minY, width, height, dstX, dstY, width, height, _gl.COLOR_BUFFER_BIT, _gl.NEAREST);
					else if (isDst3D) _gl.copyTexSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ + i, minX, minY, width, height);
					else _gl.copyTexSubImage2D(glTarget, dstLevel, dstX, dstY, minX, minY, width, height);
				}
				state.bindFramebuffer(_gl.READ_FRAMEBUFFER, null);
				state.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, null);
			} else if (isDst3D) {
				if (srcTexture.isDataTexture || srcTexture.isData3DTexture) _gl.texSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image.data);
				else if (dstTexture.isCompressedArrayTexture) _gl.compressedTexSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, image.data);
				else _gl.texSubImage3D(glTarget, dstLevel, dstX, dstY, dstZ, width, height, depth, glFormat, glType, image);
			} else if (srcTexture.isDataTexture) _gl.texSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, width, height, glFormat, glType, image.data);
			else if (srcTexture.isCompressedTexture) _gl.compressedTexSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, image.width, image.height, glFormat, image.data);
			else _gl.texSubImage2D(_gl.TEXTURE_2D, dstLevel, dstX, dstY, width, height, glFormat, glType, image);
			state.pixelStorei(_gl.UNPACK_ROW_LENGTH, currentUnpackRowLen);
			state.pixelStorei(_gl.UNPACK_IMAGE_HEIGHT, currentUnpackImageHeight);
			state.pixelStorei(_gl.UNPACK_SKIP_PIXELS, currentUnpackSkipPixels);
			state.pixelStorei(_gl.UNPACK_SKIP_ROWS, currentUnpackSkipRows);
			state.pixelStorei(_gl.UNPACK_SKIP_IMAGES, currentUnpackSkipImages);
			if (dstLevel === 0 && dstTexture.generateMipmaps) _gl.generateMipmap(glTarget);
			state.unbindTexture();
		};
		/**
		* Initializes the given WebGLRenderTarget memory. Useful for initializing a render target so data
		* can be copied into it using {@link WebGLRenderer#copyTextureToTexture} before it has been
		* rendered to.
		*
		* @param {WebGLRenderTarget} target - The render target.
		*/
		this.initRenderTarget = function(target) {
			if (properties.get(target).__webglFramebuffer === void 0) textures.setupRenderTarget(target);
		};
		/**
		* Initializes the given texture. Useful for preloading a texture rather than waiting until first
		* render (which can cause noticeable lags due to decode and GPU upload overhead).
		*
		* @param {Texture} texture - The texture.
		*/
		this.initTexture = function(texture) {
			if (texture.isCubeTexture) textures.setTextureCube(texture, 0);
			else if (texture.isData3DTexture) textures.setTexture3D(texture, 0);
			else if (texture.isDataArrayTexture || texture.isCompressedArrayTexture) textures.setTexture2DArray(texture, 0);
			else textures.setTexture2D(texture, 0);
			state.unbindTexture();
		};
		/**
		* Can be used to reset the internal WebGL state. This method is mostly
		* relevant for applications which share a single WebGL context across
		* multiple WebGL libraries.
		*/
		this.resetState = function() {
			_currentActiveCubeFace = 0;
			_currentActiveMipmapLevel = 0;
			_currentRenderTarget = null;
			state.reset();
			bindingStates.reset();
		};
		if (typeof __THREE_DEVTOOLS__ !== "undefined") __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	/**
	* Defines the coordinate system of the renderer.
	*
	* In `WebGLRenderer`, the value is always `WebGLCoordinateSystem`.
	*
	* @type {WebGLCoordinateSystem|WebGPUCoordinateSystem}
	* @default WebGLCoordinateSystem
	* @readonly
	*/
	get coordinateSystem() {
		return WebGLCoordinateSystem;
	}
	/**
	* Defines the output color space of the renderer.
	*
	* @type {SRGBColorSpace|LinearSRGBColorSpace}
	* @default SRGBColorSpace
	*/
	get outputColorSpace() {
		return this._outputColorSpace;
	}
	set outputColorSpace(colorSpace) {
		this._outputColorSpace = colorSpace;
		const gl = this.getContext();
		gl.drawingBufferColorSpace = ColorManagement._getDrawingBufferColorSpace(colorSpace);
		gl.unpackColorSpace = ColorManagement._getUnpackColorSpace();
	}
};
//#endregion
export { AlphaFormat, ArrayCamera, BoxGeometry, BufferAttribute, BufferGeometry, ByteType, ClampToEdgeWrapping, Color, ColorManagement, CubeCamera, CubeDepthTexture, CubeTexture, Data3DTexture, DataArrayTexture, DataTexture, DepthFormat, DepthStencilFormat, DepthTexture, EventDispatcher, ExternalTexture, Float32BufferAttribute, FloatType, Frustum, GLSL3, HalfFloatType, IntType, Layers, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, LinearTransfer, Matrix3, Matrix4, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshDistanceMaterial, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, OrthographicCamera, PMREMGenerator, PerspectiveCamera, Plane, PlaneGeometry, R11_EAC_Format, RED_GREEN_RGTC2_Format, RED_RGTC1_Format, RG11_EAC_Format, RGBAFormat, RGBAIntegerFormat, RGBA_ASTC_10x10_Format, RGBA_ASTC_10x5_Format, RGBA_ASTC_10x6_Format, RGBA_ASTC_10x8_Format, RGBA_ASTC_12x10_Format, RGBA_ASTC_12x12_Format, RGBA_ASTC_4x4_Format, RGBA_ASTC_5x4_Format, RGBA_ASTC_5x5_Format, RGBA_ASTC_6x5_Format, RGBA_ASTC_6x6_Format, RGBA_ASTC_8x5_Format, RGBA_ASTC_8x6_Format, RGBA_ASTC_8x8_Format, RGBA_BPTC_Format, RGBA_ETC2_EAC_Format, RGBA_PVRTC_2BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGBFormat, RGB_BPTC_SIGNED_Format, RGB_BPTC_UNSIGNED_Format, RGB_ETC1_Format, RGB_ETC2_Format, RGB_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGB_S3TC_DXT1_Format, RGFormat, RGIntegerFormat, RawShaderMaterial, RedFormat, RedIntegerFormat, RepeatWrapping, SIGNED_R11_EAC_Format, SIGNED_RED_GREEN_RGTC2_Format, SIGNED_RED_RGTC1_Format, SIGNED_RG11_EAC_Format, SRGBColorSpace, SRGBTransfer, ShaderChunk, ShaderLib, ShaderMaterial, ShortType, Texture, Uint16BufferAttribute, Uint32BufferAttribute, UniformsLib, UniformsUtils, UnsignedByteType, UnsignedInt101111Type, UnsignedInt248Type, UnsignedInt5999Type, UnsignedIntType, UnsignedShort4444Type, UnsignedShort5551Type, UnsignedShortType, Vector2, Vector3, Vector4, WebGLCoordinateSystem, WebGLCubeRenderTarget, WebGLRenderTarget, WebGLRenderer, WebGLUtils, WebXRController, createCanvasElement, error, log, warn, warnOnce };
