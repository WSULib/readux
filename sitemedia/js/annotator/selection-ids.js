function annotatorSelectionId(options) {
    var _t = annotator.util.gettext;
    var options = options || {};
    var element = options.element;

    // NOTE: May want to include wicked good xpath for efficient xpath handling
    // https://github.com/google/wicked-good-xpath

    function eval_xpath(path) {
        // utility method to simplify evaluating xpaths
        // For our purposes, all xpaths will be executed relative to the
        // configured annotator element
        var context = element[0];
        var result = document.evaluate('.' + path, context, null,
            XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
    }

    function equivalent_xpath(xpath1, xpath2) {
        // check if two xpaths find the same element
        return eval_xpath(xpath1) == eval_xpath(xpath2);
    }

    function idpath(path) {
        // take a sequential xpath generated by annotator.js/xpath-ranges
        // such as /div[13]/div[8]/span[1]
        // and create an equivalent xpath based on the ids in the document

        var path_parts = path.split('/')
        if (path_parts == '') {  path_parts.shift();  }
        // execute the xpath to find the referenced dom element
        var result = eval_xpath(path);
        var $result = $(result);

        var idxpath, test_idxpath;
        // reconstruct the xpath with ids instead of sequential selectors

        // if current element has an id, use that
        if ($result.attr('id')) {
            // if element has an id, use that
            idxpath = $result.prop('tagName').toLowerCase() + '[@id="' + $result.attr('id') + '"]';

            if (path_parts.length > 1) {
                test_idxpath = '//' + idxpath;
            } else {
                // unlikely, but if original path is only one node deep
                // use / instead of //
                test_idxpath = '/' + idxpath;
            }
            // if this id is sufficient to find the element, use it
            if (equivalent_xpath(path, test_idxpath)) {
                return test_idxpath;
            }
        } else {
            // current element has no id; use sequential filter
            // from the original xpath
            idxpath = path_parts[path_parts.length - 1];
        }

        // If the current element does not have an id, generate an id-based
        // xpath for the parent element and base the xpath on that.
        // Pop the last node test in the xpath and recurse
        // on the remaining xpath for the parent element.
        path_parts.pop()
        if (path_parts.length) {
            // combine parent xpath with current node test and return
            idxpath = idpath(path_parts.join('/')) + '/' + idxpath;
            // NOTE: could do another equivalent xpath test here,
            // but shouldn't be necessary since the parent path
            // is tested before return and current node test is unchanged
            return idxpath;
        }
    }

    function update_ranges(annotation) {
        // whenever an annotation is saved or created, convert default
        // sequential document xpaths into id-based xpaths
        if (annotation.ranges) {
            // only applicable to annotations with ranges
            // (e.g., image annotations do not have a range selection)

            // annotation data model supports multiple ranges
            $.each(annotation.ranges, function(index, range) {
                // convert any start and end xpaths that are present
                if (range.start) {
                    range.start = idpath(range.start);
                }
                if (range.end) {
                    range.end = idpath(range.end);
                }
            });
        }
    }

    return {

        start: function (app) {
            // warn if required config is not present
            if (options.element == undefined) {
                console.warn(_t("Please specify annotation context element " +
                    "in annotatorSelectionId configuration. This is required for " +
                    "calculating id-based XPaths."));
                return;
            }
        },

        beforeAnnotationCreated: function (annotation) {
            update_ranges(annotation);
        },

        beforeAnnotationUpdated: function (annotation) {
            update_ranges(annotation);
        }
    };
};
