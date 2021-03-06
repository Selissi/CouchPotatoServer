var Movie = new Class({

	Extends: BlockBase,

	action: {},

	initialize: function(self, options, data){
		var self = this;

		self.data = data;

		self.profile = Quality.getProfile(data.profile_id);
		self.parent(self, options);
		self.addEvent('injected', self.afterInject.bind(self))
	},

	create: function(){
		var self = this;

		self.el = new Element('div.movie.inlay').adopt(
			self.data_container = new Element('div.data.inlay.light', {
				'tween': {
					duration: 400,
					transition: 'quint:in:out'
				}
			}).adopt(
				self.thumbnail = File.Select.single('poster', self.data.library.files),
				self.info_container = new Element('div.info').adopt(
					self.title = new Element('div.title', {
						'text': self.getTitle()
					}),
					self.year = new Element('div.year', {
						'text': self.data.library.year || 'Unknown'
					}),
					self.rating = new Element('div.rating.icon', {
						'text': self.data.library.rating
					}),
					self.description = new Element('div.description', {
						'text': self.data.library.plot
					}),
					self.quality = new Element('div.quality', {
						'text': self.profile.get('label')+ ':'
					})
				),
				self.actions = new Element('div.actions')
			)
		);

		self.profile.get('types').each(function(type){

			// Check if quality is snatched
			var is_snatched = self.data.releases.filter(function(release){
				return release.quality_id == type.quality_id && release.status.identifier == 'snatched'
			}).pick();

			var q = Quality.getQuality(type.quality_id);
			new Element('span', {
				'text': q.label,
				'class': is_snatched ? 'snatched' : ''
			}).inject(self.quality);
		});

		Object.each(self.options.actions, function(action, key){
			self.actions.adopt(
				self.action[key.toLowerCase()] = new self.options.actions[key](self)
			)
		});

		if(!self.data.library.rating)
			self.rating.hide();

	},

	afterInject: function(){
		var self = this;

		var height = self.getHeight();
		self.el.setStyle('height', height);
	},

	getTitle: function(){
		var self = this;

		var titles = self.data.library.titles;

		var title = titles.filter(function(title){
			return title['default']
		}).pop()

		if(title)
			return  title.title
		else if(titles.length > 0)
			return titles[0].title

		return 'Unknown movie'
	},

	slide: function(direction){
		var self = this;

		if(direction == 'in'){
			self.el.addEvent('outerClick', self.slide.bind(self, 'out'))
			self.data_container.tween('left', 0, self.getWidth());
		}
		else {
			self.el.removeEvents('outerClick')
			self.data_container.tween('left', self.getWidth(), 0);
		}
	},

	getHeight: function(){
		var self = this;

		if(!self.height)
			self.height = self.data_container.getCoordinates().height;

		return self.height;
	},

	getWidth: function(){
		var self = this;

		if(!self.width)
			self.width = self.data_container.getCoordinates().width;

		return self.width;
	},

	get: function(attr){
		return this.data[attr] || this.data.library[attr]
	}

});

var MovieAction = new Class({

	class_name: 'action icon',

	initialize: function(movie){
		var self = this;
		self.movie = movie;

		self.create();
		if(self.el)
			self.el.addClass(self.class_name)
	},

	create: function(){},

	disable: function(){
		this.el.addClass('disable')
	},

	enable: function(){
		this.el.removeClass('disable')
	},

	toElement: function(){
		return this.el || null
	}

});

var IMDBAction = new Class({

	Extends: MovieAction,
	id: null,

	create: function(){
		var self = this;

		self.id = self.movie.get('identifier');

		self.el = new Element('a.imdb', {
			'title': 'Go to the IMDB page of ' + self.movie.getTitle(),
			'events': {
				'click': self.gotoIMDB.bind(self)
			}
		});

		if(!self.id) self.disable();
	},

	gotoIMDB: function(e){
		var self = this;
		(e).stop();

		window.open('http://www.imdb.com/title/'+self.id+'/');
	}

});

var ReleaseAction = new Class({

	Extends: MovieAction,
	id: null,

	create: function(){
		var self = this;

		self.id = self.movie.get('identifier');

		self.el = new Element('a.releases.icon.download', {
			'title': 'Show the releases that are available for ' + self.movie.getTitle(),
			'events': {
				'click': self.show.bind(self)
			}
		});

	},

	show: function(e){
		var self = this;
		(e).stop();

		if(!self.options_container){
			self.options_container = new Element('div.options').adopt(
				$(self.movie.thumbnail).clone(),
				self.release_container = new Element('div.releases')
			).inject(self.movie, 'top');
			
			// Header
			new Element('div.item.head').adopt(
				new Element('span.name', {'text': 'Release name'}),
				new Element('span.quality', {'text': 'Quality'}),
				new Element('span.age', {'text': 'Age'}),
				new Element('span.score', {'text': 'Score'}),
				new Element('span.provider', {'text': 'Provider'})
			).inject(self.release_container)

			Array.each(self.movie.data.releases, function(release){
				new Element('div', {
					'class': 'item ' + release.status.identifier
				}).adopt(
					new Element('span.name', {'text': self.get(release, 'name'), 'title': self.get(release, 'name')}),
					new Element('span.quality', {'text': release.quality.label}),
					new Element('span.age', {'text': self.get(release, 'age')}),
					new Element('span.score', {'text': self.get(release, 'score')}),
					new Element('span.provider', {'text': self.get(release, 'provider')}),
					new Element('a.download.icon', {
						'events': {
							'click': function(e){
								(e).stop();
								self.download(release);
							}
						}
					}),
					new Element('a.delete.icon', {
						'events': {
							'click': function(e){
								(e).stop();
								self.del(release);
								this.getParent('.item').destroy();
							}
						}
					})
				).inject(self.release_container)
			});

		}
		self.movie.slide('in');
	},

	get: function(release, type){
		var self = this;

		return (release.info.filter(function(info){
			return type == info.identifier
		}).pick() || {}).value
	},
	
	download: function(release){
		var self = this;
		
		Api.request('release.download', {
			'data': {
				'id': release.id
			}
		});
	},
	
	del: function(release){
		var self = this;

		Api.request('release.delete', {
			'data': {
				'id': release.id
			}
		})
		
	}

});