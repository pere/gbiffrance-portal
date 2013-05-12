
(function () {

    L.Util.extend(L.LineUtil, {
        segmentsIntersect: function (e, t, n, r) {
            return this._checkCounterclockwise(e, n, r) !== this._checkCounterclockwise(t, n, r) && this._checkCounterclockwise(e, t, n) !== this._checkCounterclockwise(e, t, r)
        },
        _checkCounterclockwise: function (e, t, n) {
            return (n.y - e.y) * (t.x - e.x) > (t.y - e.y) * (n.x - e.x)
        }
    }), L.Polyline.include({
        intersects: function () {
            var e = this._originalPoints,
                t = e ? e.length : 0,
                n, r, i, s, o, u;
            if (this._tooFewPointsForIntersection()) return !1;
            for (n = t - 1; n >= 3; n--) {
                i = e[n - 1], s = e[n];
                if (this._lineSegmentsIntersectsRange(i, s, n - 2)) return !0
            }
            return !1
        },
        newLatLngIntersects: function (e) {
            return this._map ? this.newPointIntersects(this._map.latLngToLayerPoint(e)) : !1
        },
        newPointIntersects: function (e) {
            var t = this._originalPoints,
                n = t ? t.length : 0,
                r = t ? t[n - 1] : null,
                i = n - 2;
            return this._tooFewPointsForIntersection(1) ? !1 : this._lineSegmentsIntersectsRange(r, e, i)
        },
        _tooFewPointsForIntersection: function (e) {
            var t = this._originalPoints,
                n = t ? t.length : 0;
            return n += e || 0, !this._originalPoints || n <= 3
        },
        _lineSegmentsIntersectsRange: function (e, t, n, r) {
            var i = this._originalPoints,
                s, o;
            r = r || 0;
            for (var u = n; u > r; u--) {
                s = i[u - 1], o = i[u];
                if (L.LineUtil.segmentsIntersect(e, t, s, o)) return !0
            }
            return !1
        }
    }), L.Polygon.include({
        intersects: function () {
            var e, t = this._originalPoints,
                n, r, i, s;
            return this._tooFewPointsForIntersection() ? !1 : (e = L.Polyline.prototype.intersects.call(this), e ? !0 : (n = t.length, r = t[0], i = t[n - 1], s = n - 2, this._lineSegmentsIntersectsRange(i, r, s, 1)))
        }
    }), L.Handler.Draw = L.Handler.extend({
        includes: L.Mixin.Events,
        initialize: function (e, t) {

            this._map = e, this._container = e._container, this._pane = e._panes.overlayPane, t && t.shapeOptions && (t.shapeOptions = L.Util.extend({}, this.options.shapeOptions, t.shapeOptions)), L.Util.extend(this.options, t)
        },
        enable: function () {
           // console.log('enable')
            this.fire("activated"), L.Handler.prototype.enable.call(this)
        },
        addHooks: function () {
            this._map && (L.DomUtil.disableTextSelection(), this._label = L.DomUtil.create("div", "leaflet-draw-label", this._pane), this._singleLineLabel = !1, L.DomEvent.addListener(window, "keyup", this._cancelDrawing, this))
        },
        removeHooks: function () {
            this._map && (L.DomUtil.enableTextSelection(), this._pane.removeChild(this._label), delete this._label, L.DomEvent.removeListener(window, "keyup", this._cancelDrawing))
        },
        _updateLabelText: function (e) {
            e.subtext = e.subtext || "", e.subtext.length === 0 && !this._singleLineLabel ? (L.DomUtil.addClass(this._label, "leaflet-draw-label-single"), this._singleLineLabel = !0) : e.subtext.length > 0 && this._singleLineLabel && (L.DomUtil.removeClass(this._label, "leaflet-draw-label-single"), this._singleLineLabel = !1), this._label.innerHTML = (e.subtext.length > 0 ? '<span class="leaflet-draw-label-subtext">' + e.subtext + "</span>" + "<br />" : "") + "<span>" + e.text + "</span>"
        },
        _updateLabelPosition: function (e) {
            L.DomUtil.setPosition(this._label, e)
        },
        _cancelDrawing: function (e) {
            e.keyCode === 27 && this.disable()
        }
    }), L.Polyline.Draw = L.Handler.Draw.extend({
        Poly: L.Polyline,
        options: {
            allowIntersection: !0,
            drawError: {
                color: "#b00b00",
                message: "<strong>Error:</strong> shape edges cannot cross!",
                timeout: 2500
            },
            icon: new L.DivIcon({
                iconSize: new L.Point(8, 8),
                className: "leaflet-div-icon leaflet-editing-icon"
            }),
            guidelineDistance: 20,
            shapeOptions: {
                stroke: !0,
                color: "#f06eaa",
                weight: 4,
                opacity: .5,
                fill: !1,
                clickable: !0
            }
        },
        initialize: function (e, t) {
            t && t.drawError && (t.drawError = L.Util.extend({}, this.options.drawError, t.drawError)), L.Handler.Draw.prototype.initialize.call(this, e, t)
        },
        addHooks: function () {
            L.Handler.Draw.prototype.addHooks.call(this), this._map && (this._markers = [], this._markerGroup = new L.LayerGroup, this._map.addLayer(this._markerGroup), this._poly = new L.Polyline([], this.options.shapeOptions), this._container.style.cursor = "crosshair", this._updateLabelText(this._getLabelText()), this._map.on("mousemove", this._onMouseMove, this).on("click", this._onClick, this))
        },
        removeHooks: function () {
            L.Handler.Draw.prototype.removeHooks.call(this), this._clearHideErrorTimeout(), this._cleanUpShape(), this._map.removeLayer(this._markerGroup), delete this._markerGroup, delete this._markers, this._map.removeLayer(this._poly), delete this._poly, this._clearGuides(), this._container.style.cursor = "", this._map.off("mousemove", this._onMouseMove).off("click", this._onClick)
        },
        _finishShape: function () {
            this._map.fire("draw:poly-created", {
                poly: new this.Poly(this._poly.getLatLngs(), this.options.shapeOptions)
            }), this.disable()
        },
        _onMouseMove: function (e) {
            var t = e.layerPoint,
                n = e.latlng,
                r = this._markers.length;
            this._currentLatLng = n, this._updateLabelPosition(t), r > 0 && (this._updateLabelText(this._getLabelText()), this._clearGuides(), this._drawGuide(this._map.latLngToLayerPoint(this._markers[r - 1].getLatLng()), t)), L.DomEvent.preventDefault(e)
        },
        _onClick: function (e) {
            var t = e.latlng,
                n = this._markers.length;
            if (n > 0 && !this.options.allowIntersection && this._poly.newLatLngIntersects(t)) {
                this._showErrorLabel();
                return
            }
            this._errorShown && this._hideErrorLabel(), this._markers.push(this._createMarker(t)), this._poly.addLatLng(t), this._poly.getLatLngs().length === 2 && this._map.addLayer(this._poly), this._updateMarkerHandler(), this._vertexAdded(t)
        },
        _updateMarkerHandler: function () {
            this._markers.length > 1 && this._markers[this._markers.length - 1].on("click", this._finishShape, this), this._markers.length > 2 && this._markers[this._markers.length - 2].off("click", this._finishShape)
        },
        _createMarker: function (e) {
            var t = new L.Marker(e, {
                icon: this.options.icon
            });
            return this._markerGroup.addLayer(t), t
        },
        _drawGuide: function (e, t) {
            var n = Math.floor(Math.sqrt(Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2))),
                r, i, s, o;
            this._guidesContainer || (this._guidesContainer = L.DomUtil.create("div", "leaflet-draw-guides", this._pane));
            for (r = this.options.guidelineDistance; r < n; r += this.options.guidelineDistance) i = r / n, s = {
                x: Math.floor(e.x * (1 - i) + i * t.x),
                y: Math.floor(e.y * (1 - i) + i * t.y)
            }, o = L.DomUtil.create("div", "leaflet-draw-guide-dash", this._guidesContainer), o.style.backgroundColor = this._errorShown ? this.options.drawError.color : this.options.shapeOptions.color, L.DomUtil.setPosition(o, s)
        },
        _updateGuideColor: function (e) {
            if (this._guidesContainer) for (var t = 0, n = this._guidesContainer.childNodes.length; t < n; t++) this._guidesContainer.childNodes[t].style.backgroundColor = e
        },
        _clearGuides: function () {
            if (this._guidesContainer) while (this._guidesContainer.firstChild) this._guidesContainer.removeChild(this._guidesContainer.firstChild)
        },
        _updateLabelText: function (e) {
            this._errorShown || L.Handler.Draw.prototype._updateLabelText.call(this, e)
        },
        _getLabelText: function () {
            var e, t, n;
            return this._markers.length === 0 ? e = {
                text: "Click to start drawing line."
            } : (t = this._measurementRunningTotal + this._currentLatLng.distanceTo(this._markers[this._markers.length - 1].getLatLng()), n = t > 1e3 ? (t / 1e3).toFixed(2) + " km" : Math.ceil(t) + " m", this._markers.length === 1 ? e = {
                text: "Click to continue drawing line.",
                subtext: n
            } : e = {
                text: "Click last point to finish line.",
                subtext: n
            }), e
        },
        _showErrorLabel: function () {
            this._errorShown = !0, L.DomUtil.addClass(this._label, "leaflet-error-draw-label"), L.DomUtil.addClass(this._label, "leaflet-flash-anim"), L.Handler.Draw.prototype._updateLabelText.call(this, {
                text: this.options.drawError.message
            }), this._updateGuideColor(this.options.drawError.color), this._poly.setStyle({
                color: this.options.drawError.color
            }), this._clearHideErrorTimeout(), this._hideErrorTimeout = setTimeout(L.Util.bind(this._hideErrorLabel, this), this.options.drawError.timeout)
        },
        _hideErrorLabel: function () {
            this._errorShown = !1, this._clearHideErrorTimeout(), L.DomUtil.removeClass(this._label, "leaflet-error-draw-label"), L.DomUtil.removeClass(this._label, "leaflet-flash-anim"), this._updateLabelText(this._getLabelText()), this._updateGuideColor(this.options.shapeOptions.color), this._poly.setStyle({
                color: this.options.shapeOptions.color
            })
        },
        _clearHideErrorTimeout: function () {
            this._hideErrorTimeout && (clearTimeout(this._hideErrorTimeout), this._hideErrorTimeout = null)
        },
        _vertexAdded: function (e) {
            this._markers.length === 1 ? this._measurementRunningTotal = 0 : this._measurementRunningTotal += e.distanceTo(this._markers[this._markers.length - 2].getLatLng())
        },
        _cleanUpShape: function () {
            this._markers.length > 0 && this._markers[this._markers.length - 1].off("click", this._finishShape)
        }
    }), L.Polygon.Draw = L.Polyline.Draw.extend({
        Poly: L.Polygon,
        options: {
            shapeOptions: {
                stroke: !0,
                color: "red",
                weight: 4,
                opacity: .5,
                fill: !0,
                fillColor: null,
                fillOpacity: .2,
                clickable: !0
            }
        },
        _updateMarkerHandler: function () {
            this._markers.length === 1 && this._markers[0].on("click", this._finishShape, this)
        },
        _getLabelText: function () {
            var e;
            return this._markers.length === 0 ? e = "Click to start drawing shape." : this._markers.length < 3 ? e = "Click to continue drawing shape." : e = "Click first point to close this shape.", {
                text: e
            }
        },
        _vertexAdded: function (e) {},
        _cleanUpShape: function () {
            this._markers.length > 0 && this._markers[0].off("click", this._finishShape)
        }
    }), L.SimpleShape = {}, L.SimpleShape.Draw = L.Handler.Draw.extend({
        addHooks: function () {
            console.warn('addhotks')

            L.Handler.Draw.prototype.addHooks.call(this), this._map && (this._map.dragging.disable(), this._container.style.cursor = "crosshair", this._updateLabelText({
            
                text: this._initialLabelText
            }), this._map.on("mousedown", this._onMouseDown, this).on("mousemove", this._onMouseMove, this))
        },
        removeHooks: function () {
            L.Handler.Draw.prototype.removeHooks.call(this), this._map && (this._map.dragging.enable(), this._container.style.cursor = "", this._map.off("mousedown", this._onMouseDown, this).off("mousemove", this._onMouseMove, this), L.DomEvent.off(document, "mouseup", this._onMouseUp), this._shape && (this._map.removeLayer(this._shape), delete this._shape)), this._isDrawing = !1
        },
        _onMouseDown: function (e) {
            this._isDrawing = !0, this._startLatLng = e.latlng, this._updateLabelText({
                text: "Release mouse to finish drawing."
            }), L.DomEvent.on(document, "mouseup", this._onMouseUp, this).preventDefault(e)
        },
        _onMouseMove: function (e) {
            var t = e.layerPoint,
                n = e.latlng;
            this._updateLabelPosition(t), this._isDrawing && (this._updateLabelPosition(t), this._drawShape(n))
        },
        _onMouseUp: function (e) {
            this._fireCreatedEvent(), this.disable()
        }
    }), L.Circle.Draw = L.SimpleShape.Draw.extend({
        options: {
            shapeOptions: {
                stroke: !0,
                color: "red",
                weight: 4,
                opacity: .5,
                fill: !0,
                fillColor: null,
                fillOpacity: .2,
                clickable: !0
            }
        },
        _initialLabelText: "Click and drag to draw circle.",
        _drawShape: function (e) {
            this._shape ? this._shape.setRadius(this._startLatLng.distanceTo(e)) : (this._shape = new L.Circle(this._startLatLng, this._startLatLng.distanceTo(e), this.options.shapeOptions), this._map.addLayer(this._shape))
        },
        _fireCreatedEvent: function () {

            this._map.fire("draw:circle-created", {
                circ: new L.Circle(this._startLatLng, this._shape.getRadius(), this.options.shapeOptions)
            })
        }
    }), L.Rectangle.Draw = L.SimpleShape.Draw.extend({
        options: {
            shapeOptions: {
                stroke: !0,
                color: "red",
                weight: 4,
                opacity: .5,
                fill: !0,
                fillColor: null,
                fillOpacity: .2,
                clickable: !0
            }
        },
        _initialLabelText: "Click and drag to draw rectangle.",
        _drawShape: function (e) {
            console.warn('draw shape')
            this._shape ? this._shape.setBounds(new L.LatLngBounds(this._startLatLng, e)) : (this._shape = new L.Rectangle(new L.LatLngBounds(this._startLatLng, e), this.options.shapeOptions), this._map.addLayer(this._shape))
        },
        _fireCreatedEvent: function () {
            this._map.fire("draw:rectangle-created", {
                rect: new L.Rectangle(this._shape.getBounds(), this.options.shapeOptions)
            })
            
        }
    }), L.Marker.Draw = L.Handler.Draw.extend({
        options: {
            icon: new L.Icon.Default
        },
        addHooks: function () {
            L.Handler.Draw.prototype.addHooks.call(this), this._map && (this._updateLabelText({
                text: "Click map to place marker."
            }), this._map.on("mousemove", this._onMouseMove, this))
        },
        removeHooks: function () {
            L.Handler.Draw.prototype.removeHooks.call(this), this._map && (this._marker && (this._marker.off("click", this._onClick), this._map.off("click", this._onClick).removeLayer(this._marker), delete this._marker), this._map.off("mousemove", this._onMouseMove))
        },
        _onMouseMove: function (e) {
            var t = e.layerPoint,
                n = e.latlng;
            this._updateLabelPosition(t), this._marker ? this._marker.setLatLng(n) : (this._marker = new L.Marker(n, {
                icon: this.options.icon
            }), this._marker.on("click", this._onClick, this), this._map.on("click", this._onClick, this).addLayer(this._marker))
        },
        _onClick: function (e) {
            this._map.fire("draw:marker-created", {
                marker: new L.Marker(this._marker.getLatLng(), {
                    icon: this.options.icon
                })
            }), this.disable()
        }
    }), L.Map.mergeOptions({
        drawControl: !1
    }), L.Control.Draw = L.Control.extend({
        options: {
            position: "topleft",
            polyline: {},
            polygon: {},
            rectangle: {},
            circle: {},
            marker: {}
        },
        handlers: {},
        onAdd: function (e) {
            var t = "leaflet-control-draw",
                n = L.DomUtil.create("div", t);
            return this.options.polyline && (this.handlers.polyline = new L.Polyline.Draw(e, this.options.polyline), this._createButton("Draw a polyline", t + "-polyline", n, this.handlers.polyline.enable, this.handlers.polyline), this.handlers.polyline.on("activated", this._disableInactiveModes, this)), this.options.polygon && (this.handlers.polygon = new L.Polygon.Draw(e, this.options.polygon), this._createButton("Draw a polygon", t + "-polygon", n, this.handlers.polygon.enable, this.handlers.polygon), this.handlers.polygon.on("activated", this._disableInactiveModes, this)), this.options.rectangle && (this.handlers.rectangle = new L.Rectangle.Draw(e, this.options.rectangle), this._createButton("Draw a rectangle", t + "-rectangle", n, this.handlers.rectangle.enable, this.handlers.rectangle), this.handlers.rectangle.on("activated", this._disableInactiveModes, this)), this.options.circle && (this.handlers.circle = new L.Circle.Draw(e, this.options.circle), this._createButton("Draw a circle", t + "-circle", n, this.handlers.circle.enable, this.handlers.circle), this.handlers.circle.on("activated", this._disableInactiveModes, this)), this.options.marker && (this.handlers.marker = new L.Marker.Draw(e, this.options.marker), this._createButton("Add a marker", t + "-marker", n, this.handlers.marker.enable, this.handlers.marker), this.handlers.marker.on("activated", this._disableInactiveModes, this)), n
        },
        _createButton: function (e, t, n, r, i) {
            var s = L.DomUtil.create("a", t, n);
            return s.href = "#", s.title = e, L.DomEvent.addListener(s, "click", L.DomEvent.stopPropagation).addListener(s, "click", L.DomEvent.preventDefault).addListener(s, "click", r, i), s
        },
        _disableInactiveModes: function () {
            for (var e in this.handlers) this.handlers.hasOwnProperty(e) && this.handlers[e].enabled && this.handlers[e].disable()
        }
    }), L.Map.addInitHook(function () {
        this.options.drawControl && (this.drawControl = new L.Control.Draw, this.addControl(this.drawControl))
    })
})();