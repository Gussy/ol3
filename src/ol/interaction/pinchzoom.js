goog.provide('ol.interaction.PinchZoom');

goog.require('ol');
goog.require('ol.View');
goog.require('ol.functions');
goog.require('ol.interaction.Interaction');
goog.require('ol.interaction.Pointer');


/**
 * @classdesc
 * Allows the user to zoom the map by pinching with two fingers
 * on a touch screen.
 *
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @param {olx.interaction.PinchZoomOptions=} opt_options Options.
 * @api stable
 */
ol.interaction.PinchZoom = function(opt_options) {

  ol.interaction.Pointer.call(this, {
    handleDownEvent: ol.interaction.PinchZoom.handleDownEvent_,
    handleDragEvent: ol.interaction.PinchZoom.handleDragEvent_,
    handleUpEvent: ol.interaction.PinchZoom.handleUpEvent_
  });

  var options = opt_options ? opt_options : {};

  /**
   * @private
   * @type {ol.Coordinate}
   */
  this.anchor_ = null;

  /**
   * @private
   * @type {number}
   */
  this.duration_ = options.duration !== undefined ? options.duration : 400;

  /**
   * @private
   * @type {number|undefined}
   */
  this.lastDistance_ = undefined;

  /**
   * @private
   * @type {number}
   */
  this.lastScaleDelta_ = 1;

};
ol.inherits(ol.interaction.PinchZoom, ol.interaction.Pointer);


/**
 * @param {ol.MapBrowserPointerEvent} mapBrowserEvent Event.
 * @this {ol.interaction.PinchZoom}
 * @private
 */
ol.interaction.PinchZoom.handleDragEvent_ = function(mapBrowserEvent) {
  ol.DEBUG && console.assert(this.targetPointers.length >= 2,
      'length of this.targetPointers should be 2 or more');
  var scaleDelta = 1.0;

  var touch0 = this.targetPointers[0];
  var touch1 = this.targetPointers[1];
  var dx = touch0.clientX - touch1.clientX;
  var dy = touch0.clientY - touch1.clientY;

  // distance between touches
  var distance = Math.sqrt(dx * dx + dy * dy);

  if (this.lastDistance_ !== undefined) {
    scaleDelta = this.lastDistance_ / distance;
  }
  this.lastDistance_ = distance;
  if (scaleDelta != 1.0) {
    this.lastScaleDelta_ = scaleDelta;
  }

  var map = mapBrowserEvent.map;
  var view = map.getView();
  var resolution = view.getResolution();

  // scale anchor point.
  var viewportPosition = map.getViewport().getBoundingClientRect();
  var centroid = ol.interaction.Pointer.centroid(this.targetPointers);
  centroid[0] -= viewportPosition.left;
  centroid[1] -= viewportPosition.top;
  this.anchor_ = map.getCoordinateFromPixel(centroid);

  // scale, bypass the resolution constraint
  map.render();
  ol.interaction.Interaction.zoomWithoutConstraints(
      map, view, resolution * scaleDelta, this.anchor_);

};


/**
 * @param {ol.MapBrowserPointerEvent} mapBrowserEvent Event.
 * @return {boolean} Stop drag sequence?
 * @this {ol.interaction.PinchZoom}
 * @private
 */
ol.interaction.PinchZoom.handleUpEvent_ = function(mapBrowserEvent) {
  if (this.targetPointers.length < 2) {
    var map = mapBrowserEvent.map;
    var view = map.getView();
    view.setHint(ol.View.Hint.INTERACTING, -1);
    var resolution = view.getResolution();
    // Zoom to final resolution, with an animation, and provide a
    // direction not to zoom out/in if user was pinching in/out.
    // Direction is > 0 if pinching out, and < 0 if pinching in.
    var direction = this.lastScaleDelta_ - 1;
    ol.interaction.Interaction.zoom(map, view, resolution,
        this.anchor_, this.duration_, direction);
    return false;
  } else {
    return true;
  }
};


/**
 * @param {ol.MapBrowserPointerEvent} mapBrowserEvent Event.
 * @return {boolean} Start drag sequence?
 * @this {ol.interaction.PinchZoom}
 * @private
 */
ol.interaction.PinchZoom.handleDownEvent_ = function(mapBrowserEvent) {
  if (this.targetPointers.length >= 2) {
    var map = mapBrowserEvent.map;
    this.anchor_ = null;
    this.lastDistance_ = undefined;
    this.lastScaleDelta_ = 1;
    if (!this.handlingDownUpSequence) {
      map.getView().setHint(ol.View.Hint.INTERACTING, 1);
    }
    return true;
  } else {
    return false;
  }
};


/**
 * @inheritDoc
 */
ol.interaction.PinchZoom.prototype.shouldStopEvent = ol.functions.FALSE;
