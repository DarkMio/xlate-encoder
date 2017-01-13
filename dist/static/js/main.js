"use strict";

document.addEventListener('DOMContentLoaded', function () {
    var converter = function () {
        var Converter = function Converter(num) {
            return {
                from: function from(baseFrom) {
                    return {
                        to: function to(baseTo) {
                            return {
                                size: function size(width) {
                                    var n = parseInt(num, baseFrom).toString(baseTo);
                                    return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
                                }
                            };
                        }
                    };
                }
            };
        };

        Converter.fullDataChunker = function (group, reprSize, from, to, size) {
            var splitEvery = function splitEvery(str, n) {
                var arr = [];
                for (var i = 0; i < str.length; i += n) {
                    arr.push(str.substr(i, n));
                }
                return arr;
            };
            return splitEvery(group, reprSize).map(function (x) {
                return Converter(x).from(from).to(to).size(size);
            });
        };

        return Converter;
    }();

    var logger = new function () {
        this.target = document.getElementById("console-output");
        var obj = this;

        var scrollDown = function scrollDown() {
            // a tiny "hack" to calculate scrollTop whenever the main layout calculation is done
            // otherwise it won't scroll down at all (if the interpreter is faster as the viewport - which is always).
            requestAnimationFrame(function () {
                obj.target.scrollTop = obj.target.scrollHeight;
            });
        };

        return {
            "log": function log(message) {
                this.raw(message);
                console.log(message);
            },
            "error": function error(message) {
                this.raw("<span class=\"console-text--error\">" + message + "</span>");
                console.error(message);
            },
            "raw": function raw(_raw) {
                if (obj.target) {
                    obj.target.innerHTML += _raw + "<br>";
                    scrollDown();
                }
            },
            "clear": function clear() {
                if (obj.target) {
                    obj.target.textContent = "";
                }
            }
        };
    }();

    var Translator = function Translator() {};

    Translator.prototype.splitEvery = function (xs, n) {
        var temp = [];
        while (xs.length > 0) {
            temp.push(xs.splice(0, n));
        }
        return temp;
    };

    Translator.prototype.init = function () {
        logger.log(">> init");
        var elements = document.getElementsByClassName("input-group");
        for (var i = 0; i < elements.length; i++) {
            this.setupElement(elements[i]);
        }
    };
    Translator.prototype.setupElement = function (element) {
        var _this = this;

        var collect = function collect(x) {
            var buttons = x.getElementsByClassName("input-group-buttons");
            return {
                "buttons": buttons,
                "area": x.getElementsByTagName("textarea"),
                "button": buttons[0].getElementsByTagName("button"),
                "input": buttons[0].getElementsByTagName("input")
            };
        };
        var validate = function validate(c) {
            // plainly assuming that they're false-y
            return !!c.buttons.length && !!c.area.length && !!c.button.length && c.input.length; // lazy mans size checker
        };

        var collection = collect(element);
        if (!validate(collection)) {
            logger.error("I got an input group with broken elements:");
            logger.error(element);
            return false;
        }

        collection.area[0].addEventListener("keyup", function () {
            logger.log(element.id + "-Text Area Activity!");
        });

        collection.input[0].addEventListener("change", function () {
            logger.log(element.id + "-Checkbox clicked!");
        });

        collection.button[0].addEventListener("click", function () {
            logger.log(element.id + "-Button clicked!");

            var dictionary = _this.buildEmptyPackage();
            dictionary[element.id] = collection.area[0];
            _this.buttonCallback(dictionary);
        });
    };

    Translator.prototype.setElementText = function (elementId, value) {
        document.getElementById(elementId).getElementsByTagName("textarea")[0].value = value;
    };

    Translator.prototype.buildEmptyPackage = function () {
        // TODO: Uh, populate the translator flexbox with this bad boy
        return {
            "_bytes": null,
            "text": null,
            "binary": null,
            "oct": null,
            "hex": null,
            "b32": null,
            "b64": null,
            "ascii": null,
            "char": null,
            "checksum": null
        };
    };

    Translator.prototype.buttonCallback = function (dictionary) {
        var _this2 = this;

        var key = Object.keys(dictionary).filter(function (y) {
            return dictionary[y] !== null;
        })[0];
        var remainder = Object.keys(dictionary).filter(function (y) {
            return dictionary[y] === null;
        });

        var obj = this;
        var ret = void 0;
        switch (key) {
            case "text":
                ret = this.fromText(dictionary.text);
                break;
            case "binary":
                ret = this.fromBinary(dictionary.binary);
                break;
            case "hex":
                ret = this.fromHex(dictionary.hex);
                break;
            default:
                logger.error("Meh, not done: " + dictionary[key]);
                return;
        }

        dictionary._bytes = ret;
        dictionary = this.bytesToAll(dictionary);

        logger.error(dictionary);

        Object.keys(dictionary).forEach(function (x) {
            if (x != "_bytes") {
                _this2.setElementText(x, dictionary[x]);
            }
        });

        dictionary.text = ret;
    };

    Translator.prototype.binaryToText = function (value) {
        return parseInt(value.value.replace(" ", ""), 2).toString();
    };

    Translator.prototype.fromText = function (value) {
        return this.splitEvery(value.value.split('').map(function (x, n) {
            return value.value.charCodeAt(n).toString(16);
        }), 4).map(function (x) {
            return x.join("");
        });
    };

    Translator.prototype.fromBinary = function (value) {
        return converter.fullDataChunker(value.value.split(" ").join(""), 32, 2, 16, 8);
    };

    Translator.prototype.fromHex = function (value) {
        return converter.fullDataChunker(value.value.split(" ").join(""), 8, 16, 16, 8);
    };

    Translator.prototype.bytesToAll = function (dictionary) {
        if (!dictionary._bytes) {
            logger.error("_bytes empty or null: " + dictionary._bytes);
            return;
        }

        var hex2string = function hex2string(str) {
            // str = str.split(" ").join("");
            var ret = "";
            for (var i = 0; i < str.length; i += 2) {
                ret += String.fromCharCode(parseInt(str.substr(i, 2), 16));
            }
            return ret;
        };

        var bytesJoined = dictionary._bytes.join("");

        dictionary.text = dictionary._bytes.map(hex2string).join("");
        dictionary.binary = converter.fullDataChunker(bytesJoined, 1, 16, 2, 4).join(" ");
        dictionary.oct = converter.fullDataChunker(bytesJoined, 2, 16, 8, 3).join(" ");
        dictionary.hex = dictionary._bytes.map(function (x) {
            return [x.slice(0, 4), " ", x.slice(4)].join("");
        }).join(" ");
        return dictionary;
    };

    var translator = new Translator();
    translator.init();
});

document.addEventListener("DOMContentLoaded", function () {
    var initConsole = function initConsole() {
        var element = document.getElementById("console");
        if (!element) {
            return;
        }
        if (window.location.hash.indexOf("dev") >= 0) {
            element.style.display = "block";
            element.style.visibility = "visible";
            element.removeAttribute("hidden");
        } else {
            element.style.display = "none";
            element.style.visibility = "hidden";
            element.setAttribute("hidden", true);
        }
    };

    window.addEventListener("hashchange", function () {
        initConsole();
    });
    initConsole();
});
//# sourceMappingURL=main.js.map