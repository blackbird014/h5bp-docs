(function($, location, exports) {
  
  var view, router, model;
  
  var DocsPage = Backbone.Model.extend({
    
    sync: function(options) {
      $.ajax($.extend(options, {
        dataType: 'html',
        url: this.url(),
        success: function(res) {
          model.set({content: $(res).find('.wikiconvertor-content').html()});
          view.render();
        }
      }));
      
      return this;
    },
    
    url: function url() {
      return '/' + this.get('path');
    }
  });
  
  var DocsView = Backbone.View.extend({
    el: '#body',
    
    events: {
      'click a': 'clickHandler'
    },
    
    initialize: function() {
      console.log('created DocsView', this, arguments);
      
      _.bindAll(this, 'clickHandler', 'addHdrAttr', 'addPermalinks');
      
      this.placeholder = this.$('.wikiconvertor-content');
      this.scroller = $('html,body');
      this.active = this.$('.wikiconvertor-pages a[href="' + model.url() + '"]');
      this.active.closest('li').addClass('wikiconvertor-pages-active');
      
      this.headings();
    },
    
    clickHandler: function clickHandler(e) {
      var target = $(e.target),
      url = target.closest('a').attr('href'),
      external = /\/\//.test(url),
      octothorpe = /#/.test(url);
      
      if(!external && !octothorpe) {
         this.active.closest('li').removeClass('wikiconvertor-pages-active');
         
         
         this.active = target.closest('li').addClass('wikiconvertor-pages-active');
         console.log('active', this.active);
         router.navigate(url, true);
         return false; 
       }
    },
    
    headings: function headings(text) {
      // # or ...
      var t = text || location.hash,
      hdr = this.placeholder.find(':header'), h;

      // First thing first deal with headings and add proper data-wiki-hdr attribute
      hdr
        .each(this.addHdrAttr)
        .each(this.addPermalinks);

      if(!t || !hdr.length) {
        return;
      }

      h = hdr.filter('#' + t);

      if(!h.length) {
        return;
      }

      this.scroller.animate({scrollTop: h.offset().top}, 0);
    },
    
    addPermalinks: function(i, header) {
      var t = $(header),
      hdr  = t.attr('id');

      $('<span class="octothorpe"><a href="' + '#' + hdr + '">#</a></span>').appendTo(t);
    },

    addHdrAttr: function(i, header) {
      var t = $(header),
      text = t.text(),
      attr = text
        // First lower case all
        .toLowerCase()

        // Then replace any special character
        .replace(/[^a-z|A-Z|\d|\s|\-]/g, '')

        // Finally, replace all blank space by - delimiter                
        .replace(/\s/g, '-');

      t.attr('id', attr);
    },
    
    render: function render() {
      $(this.placeholder).html(this.model.get('content'));
      this.headings();
      return this;
    }
  });
  
  var DocsRouter = Backbone.Router.extend({
    routes: {
      // catch all
      '*path': 'changePage'
    },
    
    changePage: function changePage(path) {
      if(path === model.get('path')) {
        return;
      }
      
      model
        .set({ path: path.substring(1) })
        .fetch();
    }
  });
  
  $(function() {
    // TODO:DEBUG:REMOVE global exports
    model = exports.model = new DocsPage({path: location.pathname.substring(1)});
    view = exports.view = new DocsView({model: model});
    router = exports.router = new DocsRouter();
    
    Backbone.history.start({ pushState: true });
  });
  
  
})(this.jQuery, this.location, this);