import pdfjsLib from '../node_modules/pdfjs-dist/build/pdf'
import PDFJSAnnotate from './PDFJSAnnotate';

pdfjsLib.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.js';

const storeAdapter = new PDFJSAnnotate.LocalStoreAdapter();
PDFJSAnnotate.setStoreAdapter(storeAdapter);

const {UI} = PDFJSAnnotate;
const RENDER_OPTIONS = {
    documentId: 'compressed.tracemonkey-pldi-09.pdf',
    pdfDocument: null,
    scale: 1.33,
    rotate: 0
};
let currentPage = null;

let viewer = document.getElementById('viewer');

let commentForm = document.querySelector('#comment-wrapper .comment-list-form');
let commentText = commentForm.querySelector('input[type="text"]');

commentForm.onsubmit = function () {
    let searchString = commentText.value.trim();
    commentText.value = '';
    commentText.focus();

    if (searchString) {
        onAddAnnotation(searchString);
    }
    return false;
};

// Clear annotations
window.onRemoveAnnotation = function () {
    PDFJSAnnotate.getAnnotations(RENDER_OPTIONS.documentId, 1).then(result => {
        result.annotations.map(item => {
            storeAdapter.deleteAnnotation(RENDER_OPTIONS.documentId, item.uuid);
        });
        renderPage();
    });
};

function getPositionOfString(mainStr, searchStr) {
    const startLen = getBlockSize(mainStr.substring(0, mainStr.indexOf(searchStr)), mainStr);
    let bodyLen = 0;

    if (searchStr.length > mainStr.length - mainStr.indexOf(searchStr)) {
        bodyLen = getBlockSize(mainStr.substring(mainStr.indexOf(searchStr)), mainStr);
    } else {
        bodyLen = getBlockSize(searchStr, mainStr);
    }

    const x = startLen / RENDER_OPTIONS.scale;
    const width = bodyLen / RENDER_OPTIONS.scale;
    return {xS: x, widthS: width};
}

window.onAddAnnotation = function onAddAnnotation(searchString) {

    currentPage.getTextContent({normalizeWhitespace: true}).then((tContent) => {

        const {items, buffer} = searchTextRows(tContent.items, searchString);

        const rectArray = items.map((item, index) => {
                console.log('item', item);

                const transform = item.transform;
                let x = transform[4];
                let y = transform[5];
                let width = item.width;


                if (items.length === 1) {
                    const {xS, widthS} = getPositionOfString(item.str, searchString);
                    x += xS;
                    width = widthS;
                } else if (items.length > 1 && index === 0) {
                    const pos1 = buffer.indexOf(searchString);
                    const firstSearchStr = item.str.substring(pos1);
                    const {xS, widthS} = getPositionOfString(item.str, firstSearchStr);
                    x += xS;
                    width = widthS;
                } else if (items.length > 1 && index === items.length - 1) {
                    const pos1 = buffer.indexOf(searchString);
                    const fullStr = items.reduce((len, currentItem, indexSum) => {
                        if (indexSum === 0) {
                            len += currentItem.str.length - pos1;
                        } else if (indexSum > 0 && indexSum < index) {
                            len += currentItem.str.length;
                        }
                        return len;
                    }, 0);
                    const rest = searchString.substring(fullStr);
                    const {xS, widthS} = getPositionOfString(item.str, rest);
                    x += xS;
                    width = widthS;
                }

                const height = item.height;

                const scale = RENDER_OPTIONS.scale;

                const boundingRect = [
                    currentPage.getViewport(scale).convertToViewportPoint(x, y),
                    currentPage.getViewport(scale).convertToViewportPoint(x + width, y + height)
                ];
                const left = Math.min(boundingRect[0][0], boundingRect[1][0]) / scale;
                const top = Math.min(boundingRect[0][1], boundingRect[1][1]) / scale + 2;

                return {"y": top, "x": left, "width": width, "height": height};
            }
        );

        if (rectArray) {
            const newAnnotation = {
                "type": "highlight",
                "color": "red",
                "rectangles": rectArray,
                "class": "Annotation",
                "page": 1
            };
            storeAdapter.addAnnotation(RENDER_OPTIONS.documentId, 1, newAnnotation);
            renderPage();
        }
    });
};

function searchTextRows(itemsList, searchString) {
    let allText = '';
    let bufferFoundedRows = '';
    let rowsArray = [];
    itemsList.map(
        (item, index) => {
            rowsArray.push({index: index, value: item.str, textPosition: allText.length, originalItem: item});
            allText += item.str;
        }
    );

    const startPosition = allText.indexOf(searchString);

    let foundItems = [];
    if (startPosition >= 0) {
        foundItems = rowsArray.reduce((accumelator, currentItem) => {
            if (currentItem.textPosition <= startPosition && startPosition < currentItem.textPosition + currentItem.value.length
                || currentItem.textPosition > startPosition && startPosition + searchString.length > currentItem.textPosition + currentItem.value.length
                || (currentItem.textPosition > startPosition && startPosition + searchString.length <= currentItem.textPosition + currentItem.value.length
                    && startPosition + searchString.length > currentItem.textPosition)
            ) {
                bufferFoundedRows += currentItem.value;
                accumelator.push(currentItem.originalItem);
            }
            return accumelator;
        }, []);
    }

    return {items: foundItems, buffer: bufferFoundedRows};
}

function renderPage() {
    UI.renderPage(1, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
        currentPage = pdfPage;
    });
}

// Loading document.
pdfjsLib.getDocument({
    url: RENDER_OPTIONS.documentId,
    cMapUrl: '../node_modules/pdfjs-dist/cmaps/',
    cMapPacked: true,
}).then(function (pdfDocument) {
    RENDER_OPTIONS.pdfDocument = pdfDocument;
    viewer.appendChild(UI.createPage(1));
    UI.renderPage(1, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
        currentPage = pdfPage;
    });
});

function intersects(a, b) {
    return (a.y < b.y1 || a.y1 > b.y || a.x1 < b.x || a.x > b.x1);
}

function getBlockSize(text, allText) {
    let aTags = document.getElementsByTagName("div");
    let found = null;

    for (let i = 0; i < aTags.length; i++) {
        if (aTags[i].textContent === allText) {
            found = aTags[i];
            break;
        }
    }

    let test = document.getElementById('Test');
    test.innerHTML = text;
    if (found) {
        test.style.fontSize = found.style.fontSize;
        test.style.fontFamily = found.style.fontFamily;
        test.style.transform = found.style.transform;
    }

    return test.getBoundingClientRect().width;
}
