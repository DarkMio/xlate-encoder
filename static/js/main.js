"use strict";

document.addEventListener('DOMContentLoaded', () => {
    const converter = (() => {
        const Converter = function (num) {
            return {
                from: function (baseFrom) {
                    return {
                        to: function (baseTo) {
                            return {
                                size: function (width) {
                                    let n = parseInt(num, baseFrom).toString(baseTo);
                                    return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
                                }
                            };
                        }
                    };
                }
            };
        };

        Converter.fullDataChunker = function(group, reprSize, from, to, size) {
            const splitEvery = (str, n) => {
                const arr = [];
                for (let i = 0; i < str.length; i += n) {
                    arr.push(str.substr(i, n));
                }
                return arr;
            };
            return splitEvery(group, reprSize).map(x => { return Converter(x).from(from).to(to).size(size) });
        };

        return Converter;
    })();



    const logger = new function() {
        this.target = document.getElementById("console-output");
        const obj = this;

        const scrollDown = () => {
            // a tiny "hack" to calculate scrollTop whenever the main layout calculation is done
            // otherwise it won't scroll down at all (if the interpreter is faster as the viewport - which is always).
            requestAnimationFrame(() => {
                obj.target.scrollTop = obj.target.scrollHeight;
            })
        };

        return {
            "log": function(message) {
                this.raw(message);
                console.log(message);
            },
            "error": function(message) {
                this.raw("<span class=\"console-text--error\">" + message + "</span>");
                console.error(message);
            },
            "raw": function(raw) {
                if(obj.target) {
                    obj.target.innerHTML += raw + "<br>";
                    scrollDown();
                }
            },
            "clear": function() {
                if(obj.target) {
                    obj.target.textContent = "";
                }
            }
        }
    }();

    const Translator = function() { };

    Translator.prototype.splitEvery = function(xs, n) {
        const temp = [];
        while(xs.length > 0) {
            temp.push(xs.splice(0, n));
        }
        return temp;
    };

    Translator.prototype.init = function() {
        logger.log(">> init");
        const elements = document.getElementsByClassName("input-group");
        for(let i = 0; i < elements.length; i++) {
            this.setupElement(elements[i]);
        }
    };
    Translator.prototype.setupElement = function(element) {
        const collect = (x) => {
            const buttons = x.getElementsByClassName("input-group-buttons");
            return {
                "buttons": buttons,
                "area": x.getElementsByTagName("textarea"),
                "button": buttons[0].getElementsByTagName("button"),
                "input": buttons[0].getElementsByTagName("input")
            };
        };
        const validate = (c) => { // plainly assuming that they're false-y
            return !!c.buttons.length && !!c.area.length && !!c.button.length && c.input.length; // lazy mans size checker
        };

        const collection = collect(element);
        if(!validate(collection)) {
            logger.error("I got an input group with broken elements:");
            logger.error(element);
            return false;
        }



        collection.area[0].addEventListener("keyup", () => {
            logger.log(element.id + "-Text Area Activity!");
        });

        collection.input[0].addEventListener("change", () => {
            logger.log(element.id + "-Checkbox clicked!");
        });

        collection.button[0].addEventListener("click", () => {
            logger.log(element.id + "-Button clicked!");

            const dictionary = this.buildEmptyPackage();
            dictionary[element.id] = collection.area[0];
            this.buttonCallback(dictionary);
        });
    };

    Translator.prototype.setElementText = function(elementId, value) {
        document.getElementById(elementId).getElementsByTagName("textarea")[0].value = value;
    };

    Translator.prototype.buildEmptyPackage = () => {
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

    Translator.prototype.buttonCallback = function(dictionary) {
        const key = Object.keys(dictionary).filter(y => { return dictionary[y] !== null; })[0];
        const remainder = Object.keys(dictionary).filter(y => { return dictionary[y] === null; });

        const obj = this;
        let ret;
        switch(key) {
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

        Object.keys(dictionary).forEach(x => {
            if(x != "_bytes") {
                this.setElementText(x, dictionary[x]);
            }
        });

        dictionary.text = ret;
    };

    Translator.prototype.binaryToText = (value) => {
        return parseInt(value.value.replace(" ", ""), 2).toString();
    };

    Translator.prototype.fromText = function(value) {
        return this.splitEvery(
            value
            .value
            .split('')
            .map((x, n) => {
                return value.value.charCodeAt(n).toString(16)
            }),
            4)
            .map(x => { return x.join("") });
    };

    Translator.prototype.fromBinary = (value) => {
        return converter.fullDataChunker(value.value.split(" ").join(""), 32, 2, 16, 8);
    };

    Translator.prototype.fromHex = (value) => {
        return converter.fullDataChunker(value.value.split(" ").join(""), 8, 16, 16, 8);
    };

    Translator.prototype.bytesToAll = (dictionary) => {
        if(!dictionary._bytes) {
            logger.error("_bytes empty or null: " + dictionary._bytes);
            return;
        }

        const hex2string = (str) => {
            // str = str.split(" ").join("");
            let ret = "";
            for(let i = 0; i < str.length; i += 2) {
                ret += String.fromCharCode(parseInt(str.substr(i, 2), 16));
            }
            return ret;
        };

        const bytesJoined = dictionary._bytes.join("");

        dictionary.text = dictionary._bytes.map(hex2string).join("");
        dictionary.binary = converter.fullDataChunker(bytesJoined, 1, 16, 2, 4).join(" ");
        dictionary.oct = converter.fullDataChunker(bytesJoined, 2, 16, 8, 3).join(" ");
        dictionary.hex = dictionary._bytes.map(x => { return [x.slice(0, 4), " ", x.slice(4)].join("")}).join(" ");
        return dictionary;
    };

    const translator = new Translator();
    translator.init();
});



document.addEventListener("DOMContentLoaded", () => {
    const initConsole = () => {
        const element = document.getElementById("console");
        if(!element) {
            return;
        }
        if(window.location.hash.indexOf("dev") >= 0) {
            element.style.display = "block";
            element.style.visibility = "visible";
            element.removeAttribute("hidden");
        } else {
            element.style.display = "none";
            element.style.visibility = "hidden";
            element.setAttribute("hidden", true);
        }
    };

    window.addEventListener("hashchange", function() {
        initConsole();
    });
    initConsole();
});