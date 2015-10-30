{% load static %}

<script type="text/javascript" charset="utf-8">
   $(document).ready(function () {
      // set up seadragon configuration (not loaded unless triggered by user)
      set_seadragon_opts({
          id: "zoom-page",
          prefixUrl: "{% static 'js/openseadragon/images/' %}",
          tileSources: "{% url 'books:page-image' page.volume.pid page.pid 'info' %}",
          toolbar: 'deepzoom-controls',
          showNavigator: true,
          navigatorPosition: 'TOP_LEFT',
          zoomInButton: 'dz-zoom-in',
          zoomOutButton: 'dz-zoom-out',
          homeButton: 'dz-home',
          fullPageButton: 'dz-fs',
      });

      {# only enable annotation if tei is present for logged in users #}
      {% if page.tei.exists and user.is_authenticated %}

      /* function to include page & volume urls in the annotation data */
      var readuxUris = function () {
        return {
          beforeAnnotationCreated: function (ann) {
            ann.uri = '{{ page.absolute_url }}';
            ann.volume_uri = '{{ page.volume.absolute_url }}';
            {% if page.ark_uri %}
            ann.ark = '{{ page.ark_uri }}';
            {% endif %}
          }
        };
      };
      var _marginalia = annotatorMarginalia();
      var app = new annotator.App()
          .include(annotator.ui.main, {
              element: document.querySelector('.content .inner'),
              {% comment %}/*  {# not using default viewer, so these don't matter, see marginalia #}
              viewerExtensions: [
                  annotatormeltdown.viewerExtension,
                  annotator.ui.tags.viewerExtension
              ],
              */{% endcomment %}
              editorExtensions: [
                  annotatormeltdown.getEditorExtension({min_width: '500px'}),
                  suppress_permissions.editorExtension,
                  _marginalia.editorExtension
              ]
          })
          .include(annotator.storage.http, {
              prefix: '{% url "annotation-api-prefix" %}',
              headers: {"X-CSRFToken": csrftoken}
          })
          .include(readuxUris)
          .include(annotatorImageSelect, {
            element: $('.content .inner img'),
          })
          .include(annotatorSelectionId, {
            element: $('.content .inner'),
          })
          .include(annotatorMarginalia, {
            {% if user.is_superuser %}
            show_author: true,
            {% endif %}
            viewer: annotatormeltdown.render,
            toggle:{
              class: 'btn btn-green',
              show: function(){
                $(".carousel-control").fadeOut();
              },
              hide: function(){
                $(".carousel-control").fadeIn();
              }
            }
          })

      app.start()
          .then(function () {
               app.annotations.load({uri: '{{ page.absolute_url }}'});
          });
      {# set user identity to allow for basic permission checking #}
      app.ident.identity = "{{ user.username }}";

      {% endif %} {# end annotation config #}

   });
   {% if page.tei.exists %}
   // adjust ocr word & letter spacing on load & resize, with a timeout
   // to avoid adjusting too frequently as the browser is resized

      var resizeTimer; // Set resizeTimer to empty so it resets on page load
      function resizeFunction() {
          // adjust font sizes based on container to use viewport height
          $(".page img").relativeFontHeight({elements: $('.ocr-line')});
          // adjust ocr text on window load or resize
          $(".ocrtext").textwidth();
      };

      // On resize, run the function and reset the timeout with a 250ms delay
      $(window).resize(function() {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(resizeFunction, 250);
      });

     $(window).load(function() {  // wait until load completes, so widths will be calculated
         resizeFunction();
     });
   {% endif %}
</script>