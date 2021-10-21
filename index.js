var M_WIDTH = 450, M_HEIGHT = 800;
var app, game_res, gres, objects = {}, my_data={};
var g_process = () => {};
var any_dialog_active = 0, game_tick=0, game_platform="", state="", pic_changes=10, activity_on=1;
var cur_progress = -1, global_record = -1;

var puzzle_pic_loader=new PIXI.Loader();

rnd= Math.random;
rnd2= function(min,max) {	
	let r=Math.random() * (max - min) + min
	return Math.round(r * 100) / 100
};
irnd=function(min,max) {	
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class puzzle_cell_class extends PIXI.Container {
	
	constructor(cell_id) {
		super();
		
		this.true_id=cell_id;
		this.cur_id=cell_id;	
		
		this.tween_spd=4.3;
		
		this.dist_to_target=0;
		
		this.cur_fx=0;
		this.cur_fy=0;		
		
		this.tar_fx=0;
		this.tar_fy=0;
		
		this.fdx=0;
		this.fdy=0;
		
		this.tar_id=-999;
		
		this.width=1;
		this.height=1;
		
		this.cell=new PIXI.Sprite();	
		this.cell.interactive=true;
		this.cell.buttonMode=true;
		this.cell.pointerdown = this.pointer_down.bind(this);



		this.cell.width=1;
		this.cell.height=1;	
		
		this.cell_ok=new PIXI.Sprite();
		this.cell_ok.texture=gres.cell_ok.texture;
		this.cell_ok.visible=false;
		
		this.cell_selected=new PIXI.Sprite();
		this.cell_selected.texture=gres.cell_selected.texture;
		this.cell_selected.visible=false;
		
		this.hint=new PIXI.Sprite();
		this.hint.texture=gres.hint_image.texture;
		this.hint.visible=false;
		
		
		this.addChild(this.cell, this.cell_ok, this.hint, this.cell_selected);
	}
	
	pointer_down() {
		
		puzzle.cell_down(this.true_id);
		
	}
	
	set_to_cell(cell_id, board_size, cell_size, image_size) {
				
		this.cur_id=cell_id;
		this.cell.texture.frame.x=(cell_id%board_size)*(image_size/board_size);
		this.cell.texture.frame.y=~~(cell_id/board_size)*(image_size/board_size);
		this.cell.texture.frame.width=image_size/board_size;
		this.cell.texture.frame.height=image_size/board_size;
		this.cell.width=this.cell_selected.width=this.cell_ok.width=this.hint.width=cell_size;
		this.cell.height=this.cell_selected.height=this.cell_ok.height=this.hint.height=cell_size;
		
		this.width=cell_size;
		this.height=cell_size;
		this.cell.texture.updateUvs();
	}
	
	prepare_shuffle(tar_true_id, board_size, cell_size, image_size) {
		
		//получаем текущий блок на который ссылкается целевая ячейка
		this.tar_id=tar_true_id;	
		
		this.cur_fx=this.cell.texture.frame.x;
		this.cur_fy=this.cell.texture.frame.y;
		
		this.tar_fx=(this.tar_id%board_size)*(image_size/board_size);
		this.tar_fy=~~(this.tar_id/board_size)*(image_size/board_size);
		
		this.fdx=this.tar_fx-this.cur_fx;
		this.fdy=this.tar_fy-this.cur_fy;
		
		this.dist_to_target=Math.sqrt(this.fdx*this.fdx+this.fdy*this.fdy);
		this.fdx=this.fdx/this.dist_to_target;
		this.fdy=this.fdy/this.dist_to_target;
		
	}
	
	move_to_target(amount) {
		
		this.cell.texture.frame.x = this.cur_fx + this.fdx * this.dist_to_target * amount;
		this.cell.texture.frame.y = this.cur_fy + this.fdy * this.dist_to_target * amount;
		this.cell.texture.updateUvs();			
	}
	
	finish_move() {
		
		this.cur_id=this.tar_id;
		
		this.cur_fx = this.tar_fx;
		this.cur_fy = this.tar_fy;
		
		this.cell.texture.frame.x = this.cur_fx;
		this.cell.texture.frame.y = this.cur_fy;	
		
		this.cell.texture.updateUvs();	
	}
	
	process() {
		
		
	}
	
}

class lb_player_card_class extends PIXI.Container{
	
	constructor(x,y,place) {
		super();

		this.bcg=new PIXI.Sprite(game_res.resources.lb_player_card_bcg.texture);
		this.bcg.interactive=true;
		this.bcg.pointerover=function(){this.tint=0x55ffff};
		this.bcg.pointerout=function(){this.tint=0xffffff};
				
		
		this.place=new PIXI.BitmapText("1", {fontName: 'Century Gothic', fontSize: 24});
		this.place.x=20;
		this.place.y=20;
		this.place.tint=0x220022;
		
		this.avatar=new PIXI.Sprite();
		this.avatar.x=40;
		this.avatar.y=10;
		this.avatar.width=this.avatar.height=48;
		
		
		this.name=new PIXI.BitmapText(' ', {fontName: 'Century Gothic', fontSize: 25});
		this.name.x=100;
		this.name.y=20;
		this.name.tint=0x002222;
		
	
		this.record=new PIXI.BitmapText(' ', {fontName: 'Century Gothic', fontSize: 30});
		this.record.x=320;
		this.record.tint=0x002222;
		this.record.y=20;		
		
		this.addChild(this.bcg,this.place, this.avatar, this.name, this.record);		
	}
	
	
}

var puzzle = {
	
	size: 3,
	cell_size:100,
	x:25,
	y:150,
	image_size:400,
	hints_amount:0,
	width:400,
	ec1:null,
	ec2:null,
	completed: 0,
	tween_amount:0,	
	state:"",	
	
	get_random_array: function() {
				
		let random_array=[...Array(this.size*this.size).keys()];		
		let currentIndex = random_array.length;
		let randomIndex=0;
		
				
		// While there remain elements to shuffle...
		while (currentIndex != 0) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[random_array[currentIndex], random_array[randomIndex]] = [random_array[randomIndex], random_array[currentIndex]];
		}
		
		
		for (let i =0; i< random_array.length; i++) {
			
			if (i===random_array[i])
				return this.get_random_array();
		}
			

		return random_array;
	},
	
	set_size(size) {
		
		this.size=size;	
				
		if (this.size === 3)	{this.cell_size = 130}
		if (this.size === 4)	{this.cell_size = 102.5}
		if (this.size === 5)	{this.cell_size = 86}
		
		this.hints_amount =	this.size-2;
		
		this.width = this.cell_size *	this.size;	
		this.x = (450 - this.width) / 2;
		this.y=210 - (this.size-3)*10
	},
	
	init: function () {
		
		state="";
		this.completed=0;
		
		//на всякий случай убираем выделения
		this.ec1=this.ec2=null;
		
		//обновляем размер		
		this.set_size(this.size);
		
		//подготавливаем пазлы и ставим их на правильное место
		let i=0;
		for (let y=0;y<this.size;y++) {			
			for (let x=0;x<this.size;x++) {	
			
				objects.puzzle_cells[i].cell.texture=objects.puzzle_img.texture.clone();	
				objects.puzzle_cells[i].x=this.x+x*this.cell_size;
				objects.puzzle_cells[i].y=this.y+y*this.cell_size;
				objects.puzzle_cells[i].set_to_cell(i,this.size,this.cell_size, this.image_size);	
				objects.puzzle_cells[i].visible=true;
				objects.puzzle_cells[i].rotation=0;
				objects.puzzle_cells[i].cell_ok.visible=false;
				objects.puzzle_cells[i].cell_selected.visible=false;
				
				i++;				
			}
		}		
	},
	
	hide_selected : function () {
		
		let i=0;
		for (let y=0;y<this.size;y++) {			
			for (let x=0;x<this.size;x++) {				
				objects.puzzle_cells[i].cell_ok.visible=false;
				objects.puzzle_cells[i].cell_selected.visible=false;
				i++;				
			}		
		}	

	},
	
	prepare_shuffle: function () {
		
		//создаем случайный массив 
		let s_arr=this.get_random_array();		
		
		//вычисляем данные для последующей перестановки
		for (let i=0;i<this.size*this.size;i++) {			
			let tar_id=objects.puzzle_cells[s_arr[i]].cur_id;
			objects.puzzle_cells[i].prepare_shuffle(tar_id,this.size, this.cell_size, this.image_size);
		}
			
		state="";
		
	},
	
	start_back_shuffle: function() {
		
		//вычисляем данные для последующей перестановки
		for (let i=0;i<this.size*this.size;i++)
			objects.puzzle_cells[i].prepare_shuffle(i,this.size, this.cell_size, this.image_size);
		state="back_shuffling";
		this.tween_amount=0;
		
	},
		
	shuffle : function () {		
		this.prepare_shuffle();		
		state="init_shuffling";
		this.tween_amount=0;
	},
	
	show_hint: function () {
		
		if (state!=="game")
			return;
		
		//это если нет подсказок
		if (this.hints_amount===0) {
			game_res.resources.blocked.sound.play();
			return;			
		}

		this.hints_amount--;
		
		let rnd_cell=irnd(1,this.size*this.size)-1;	
		
		
		if (objects.puzzle_cells[rnd_cell].cur_id!==objects.puzzle_cells[rnd_cell].true_id) {
			
			let cur_id=objects.puzzle_cells[rnd_cell].cur_id;
			
			anim.add_pos({obj: objects.puzzle_cells[rnd_cell].hint,param: 'alpha',vis_on_end: false,func: 'ease2back',val: [0,1],	speed: 0.005});	
			anim.add_pos({obj: objects.puzzle_cells[cur_id].hint,param: 'alpha',vis_on_end: false,func: 'ease2back',val: [0,1],	speed: 0.005});	
			
		} else {			
			this.show_hint();			
		}
		
		return true;
		
		
	},
	
	process : function() {
		
		if (state==="init_shuffling") {
			
			for (let i=0;i<this.size*this.size;i++)
				objects.puzzle_cells[i].move_to_target(this.tween_amount);
			this.tween_amount+=0.03;
			
			if (this.tween_amount>=1) {
				for (let i=0;i<this.size*this.size;i++)
					objects.puzzle_cells[i].finish_move();
				state="game";
			}			
		}
		
		if (state==="back_shuffling") {
			
			for (let i=0;i<this.size*this.size;i++)
				objects.puzzle_cells[i].move_to_target(this.tween_amount);
			this.tween_amount+=0.03;
			
			if (this.tween_amount>=1) {
				for (let i=0;i<this.size*this.size;i++) {
					objects.puzzle_cells[i].finish_move();				
					objects.puzzle_cells[i].visible=false;
				}
				
				objects.mask_bcg.visible = false;
				objects.main_bcg.visible = true;
				
				state="";
			}			
		}

		if (state==="shuffling") {
			
			this.ec1.move_to_target(this.tween_amount);
			this.ec2.move_to_target(this.tween_amount);
			this.tween_amount+=0.025;
			
			if (this.tween_amount>=1) {
				this.tween_amount=0;
				this.ec1.finish_move();
				this.ec2.finish_move();
				
				//если целевая ячейка соответствует правильной то показываем на ячейке соответствующий значек
				let hits =0
				if (this.ec1.cur_id===this.ec1.true_id) {
					anim.add_pos({obj: this.ec1.cell_ok,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.5],	speed: 0.03});
					hits++;				
					this.completed++;
				}
				
				if (this.ec2.cur_id===this.ec2.true_id) {
					anim.add_pos({obj: this.ec2.cell_ok,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.5],	speed: 0.03});					
					hits++;		
					this.completed++;
				}
				
				if (hits === 1)
					game_res.resources.open.sound.play();
				
				if (hits === 2)
					game_res.resources.open2.sound.play();
				
				//указываем сколько процентов завершено
				let perc_complete = Math.round(100 * this.completed / (this.size * this.size));
				objects.complete_counter.text = `Завершено: ${perc_complete}%`;

				//perc_complete=20;
				//проверяем что паззл собран
				if (perc_complete === 100)		
					game.process_finish(1)
					

				state="game";
				
				//удаляем выделенные ячейки
				this.ec1=this.ec2=null;

				
			}
			
		}
		
	},
	
	hide : function () {		
		for (let i=0;i<this.size*this.size;i++)
			objects.puzzle_cells[i].visible=false;
	},
	
	cell_down : function(ind) {
							
		if (state!=="game")
			return;
			
		//если выбрана завершенная ячейка то выходим
		if (objects.puzzle_cells[ind].cur_id===objects.puzzle_cells[ind].true_id) {
			game_res.resources.move_sel.sound.play();
			return;			
		}
		
		//если нажата таже ячейка то отменяем выделение и выходиим
		if (this.ec1!==null) {
			if (ind===this.ec1.true_id) {
				anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: false,func: 'linear',val: [0.8,0],	speed: 0.05});	
				this.ec1=null;		
				game_res.resources.move_out.sound.play();
				return;
			}		
		}
		
		game_res.resources.move.sound.play();

		//если уже выделена одная ячейка
		if (this.ec1!==null) {			
			
			//начинаем процесс перемещения клеток
			this.ec2=objects.puzzle_cells[ind];
			
			anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: false,func: 'easeOutBack',val: [0.8,0],	speed: 0.05});	
			
			this.ec1.prepare_shuffle(this.ec2.cur_id,this.size, this.cell_size, this.image_size);
			this.ec2.prepare_shuffle(this.ec1.cur_id,this.size, this.cell_size, this.image_size);
			
			//сообщаем в игру что сдела своп
			//game.made_a_swap();
			
			state="shuffling";
			this.tween_amount=0;
			
		} else {					
			this.ec1=objects.puzzle_cells[ind];
			anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.8],	speed: 0.05});	
		}	
	}
	

}

var make_text = function (obj, text, max_width) {
		
	let sum_v=0;
	let f_size=obj.fontSize;
	
	for (let i=0;i<text.length;i++) {
		
		let code_id=text.charCodeAt(i);
		let char_obj=game_res.resources.m2_font.bitmapFont.chars[code_id];
		if (char_obj===undefined) {
			char_obj=game_res.resources.m2_font.bitmapFont.chars[83];			
			text = text.substring(0, i) + 'S' + text.substring(i + 1);
		}		

		sum_v+=char_obj.xAdvance*f_size/64;	
		if (sum_v>max_width) {
			obj.text =  text.substring(0,i-1);					
			return;
		}
	}
	
	obj.text =  text;	
}

var big_message={
	
	ok_callback: function(){},
	close_callback: function(){},
	
	show: function(header, text,text2, ok_callback, close_callback) {
		
		any_dialog_active=1;


		if (text2!==undefined || text2!=="")
			objects.big_message_text2.text=text2;
		else
			objects.big_message_text2.text='**********';
		
		//колбэк на нажатие кнопки
		if (ok_callback===undefined || ok_callback===null)
			this.ok_callback=()=>{};
		else
			this.ok_callback=ok_callback;
		
		
		//колбэк на закрытие окна
		if (close_callback===undefined || close_callback===null)
			this.close_callback=()=>{};
		else
			this.close_callback=close_callback;
		
		
		
		objects.big_message_header.text=header;

		objects.big_message_text.text=text;
		anim.add_pos({obj:objects.big_message_cont,param:'y',vis_on_end:true,func:'easeOutBack',val:[-180, 	'sy'],	speed:0.02});
			
	},
	
	close : function() {
		
		any_dialog_active=0;
		anim.add_pos({obj:objects.big_message_cont,param:'y',vis_on_end:false,func:'easeInBack',val:['sy', 	800],	speed:0.05});
		game_res.resources.close.sound.play();
		
	},
	
	close_down : function () {
		
		if (objects.big_message_cont.ready===false)
			return;
		
		this.close_callback();		
		this.close();
	},
	
	ok_down : function () {
		
		if (objects.big_message_cont.ready===false)
			return;
		
		this.ok_callback();		
		this.close();		
	}
	
}

var mini_message = {
	
	timeout_id :0,
	
	show: function(text) {
		
		objects.mini_message_text.text=text;
		anim.add_pos({obj:objects.mini_message_cont,param:'y',vis_on_end:true,func:'easeOutBack',val:[-180, 	'sy'],	speed:0.02});
		
		clearTimeout (this.timeout_id);
		this.timeout_id = setTimeout(function() {			
			mini_message.close();
		},2000)
			
	},
	
	close : function() {
		
		anim.add_pos({obj:objects.mini_message_cont,param:'y',vis_on_end:false,func:'easeInBack',val:['sy', 	-180],	speed:0.05});
		
	}

	
}

var pbd = {
	
	
	show : function () {
		
		any_dialog_active=1;
		anim.add_pos({obj:objects.pbd_cont,param:'y',vis_on_end:true,func:'easeOutBack',val:[800,'sy'],	speed:0.05});
		
	},
	
	close : function () {
		
		if (activity_on === 1)
			return;
		
		
		game_res.resources.close.sound.play();
		
		any_dialog_active=0;
		anim.add_pos({obj:objects.pbd_cont,param:'y',vis_on_end:false,func:'easeInBack',val:['sy', 	800],	speed:0.05});

		
	},
	
	ok_down : function () {		
		
		if (activity_on === 1)
			return;
		
		if (game_platform === "YANDEX") {	
			
			activity_on = 1;
			
			ysdk.adv.showRewardedVideo({
				callbacks: {
					onOpen: () => {
					},
					onRewarded: () => {
						pbd.rewarded(1);
					},
					onClose: () => {
						pbd.rewarded(0);
					}, 
					onError: (e) => {
						pbd.rewarded(0);
					}
				}
			})		
		}	
		
		
		if (game_platform === "VK") {
			
			activity_on = 1;
			
			vkBridge.send("VKWebAppShowNativeAds", {ad_format:"reward"})
			.then(function() { pbd.rewarded(1) })
			.catch(function() { pbd.rewarded(0) });				
		}
		
		if(game_platform === "debug" || game_platform === "unknown")
			 pbd.rewarded(0);
		
	},
	
	rewarded : function(is_ok) {
		
		activity_on = 0;
		
		if (is_ok === 1) {
			
			game_res.resources.popup.sound.play();
			
			//увеличиваем количество смен картинок
			my_data.fpc+=5;		

			//обновляем на сервере
			firebase.database().ref("players/"+my_data.uid+"/fpc").set(my_data.fpc);
			
			//показываем сколько осталось смен картинок
			objects.pic_changes_text.text=my_data.fpc;				
		} else {
			
			game_res.resources.move_sel.sound.play();
			big_message.show('Ошибка','Не получилось загрузить рекламу','Побробуйте позже', function(){big_message.close()},null);
		}
		
		

		
			
		
		any_dialog_active=0;
		
		//убираем диалог
		anim.add_pos({obj:objects.pbd_cont,param:'y',vis_on_end:false,func:'easeInBack',val:['sy', 	800],	speed:0.05});	
		
	}
	
	
}

var anim = {

	c1: 1.70158,
	c2: 1.70158 * 1.525,
	c3: 1.70158 + 1,
	c4: (2 * Math.PI) / 3,
	c5: (2 * Math.PI) / 4.5,

	slot: [null, null, null, null, null, null, null, null, null, null, null],
	linear: function(x) {
		return x
	},
	linear_and_back: function(x) {

		return x < 0.2 ? x * 5 : 1.25 - x * 1.25

	},
	easeOutElastic: function(x) {
		return x === 0 ?
			0 :
			x === 1 ?
			1 :
			Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * this.c4) + 1;
	},
	easeOutBounce: function(x) {
		const n1 = 7.5625;
		const d1 = 2.75;

		if (x < 1 / d1) {
			return n1 * x * x;
		} else if (x < 2 / d1) {
			return n1 * (x -= 1.5 / d1) * x + 0.75;
		} else if (x < 2.5 / d1) {
			return n1 * (x -= 2.25 / d1) * x + 0.9375;
		} else {
			return n1 * (x -= 2.625 / d1) * x + 0.984375;
		}
	},
	easeOutCubic: function(x) {
		return 1 - Math.pow(1 - x, 3);
	},
	easeOutQuart: function(x) {
		return 1 - Math.pow(1 - x, 4);
	},
	easeOutQuint: function(x) {
		return 1 - Math.pow(1 - x, 5);
	},
	easeInCubic: function(x) {
		return x * x * x;
	},
	easeInQuint: function(x) {
		return x * x * x * x * x;
	},	
	easeInOutQuad: function(x) {
		return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
	},	
	ease2back : function(x) {
		return Math.sin(x*Math.PI*2);
	},
	easeOutBack: function(x) {
		return 1 + this.c3 * Math.pow(x - 1, 3) + this.c1 * Math.pow(x - 1, 2);
	},
	easeInBack: function(x) {
		return this.c3 * x * x * x - this.c1 * x * x;
	},
	add_pos: function(params) {

		if (params.callback === undefined)
			params.callback = () => {};

		//если уже идет анимация данного спрайта то отменяем ее
		for (var i=0;i<this.slot.length;i++)
			if (this.slot[i]!==null)
				if (this.slot[i].obj===params.obj)
					this.slot[i]=null;

		//ищем свободный слот для анимации
		for (var i = 0; i < this.slot.length; i++) {

			if (this.slot[i] === null) {

				params.obj.visible = true;
				//params.obj.alpha = 1;
				params.obj.ready = false;

				//если в параметрах обозначена строка  - предполагаем что это параметр объекта
				if (typeof(params.val[0]) === 'string')
					params.val[0] = params.obj[params.val[0]];
				if (typeof(params.val[1]) === 'string')
					params.val[1] = params.obj[params.val[1]];

				params.obj[params.param] = params.val[0];
				var delta = params.val[1] - params.val[0];
				this.slot[i] = {
					obj: params.obj,
					process_func: this.process_pos.bind(this),
					param: params.param,
					vis_on_end: params.vis_on_end,
					delta,
					func: this[params.func].bind(anim),
					start_val: params.val[0],
					speed: params.speed,
					progress: 0,
					callback: params.callback
				};
				return;
			}

		}

		console.log("Нет свободных слотов для анимации");

	},
	add_scl: function(params) {

		if (params.callback === undefined)
			params.callback = () => {};

		//ищем свободный слот для анимации
		for (var i = 0; i < this.slot.length; i++) {

			if (this.slot[i] === null) {

				params.obj.visible = true;
				params.obj.alpha = 1;
				params.obj.ready = false;

				var delta = params.val[1] - params.val[0];
				this.slot[i] = {
					obj: params.obj,
					process_func: this.process_scl.bind(this),
					param: params.param,
					vis_on_end: params.vis_on_end,
					delta,
					func: this[params.func].bind(anim),
					start_val: params.val[0],
					speed: params.speed,
					progress: 0,
					callback: params.callback
				};
				return;
			}

		}

		console.log("Нет свободных слотов для анимации");

	},
	process: function() {
		for (var i = 0; i < this.slot.length; i++)
			if (this.slot[i] !== null)
				this.slot[i].process_func(i);
	},
	process_pos: function(i) {


		this.slot[i].obj[this.slot[i].param] = this.slot[i].start_val + this.slot[i].delta * this.slot[i].func(this.slot[i].progress);

		if (this.slot[i].progress >= 1) {
			this.slot[i].obj[this.slot[i].param]=this.slot[i].start_val + this.slot[i].delta;
			this.slot[i].callback();
			this.slot[i].obj.visible = this.slot[i].vis_on_end;
			this.slot[i].obj.ready = true;
			this.slot[i] = null;
			return;
		}

		this.slot[i].progress += this.slot[i].speed;
	},
	process_scl: function(i) {

		this.slot[i].obj.scale[this.slot[i].param] = this.slot[i].start_val + this.slot[i].delta * this.slot[i].func(this.slot[i].progress);

		if (this.slot[i].progress >= 1) {
			this.slot[i].callback();
			this.slot[i].obj.visible = this.slot[i].vis_on_end;
			this.slot[i].obj.ready = true;
			this.slot[i] = null;
			return;
		}

		this.slot[i].progress += this.slot[i].speed;
	}

}

var anim2= {
	
	slot: [null, null, null, null, null, null, null, null, null, null, null],
	
	linear: function(x) {
		return x
	},
	
	kill_anim: function(obj) {
		
		for (var i=0;i<this.slot.length;i++)
			if (this.slot[i]!==null)
				if (this.slot[i].obj===obj)
					this.slot[i]=null;		
	},
	
	easeOutBack: function(x) {
		return 1 + this.c3 * Math.pow(x - 1, 3) + this.c1 * Math.pow(x - 1, 2);
	},
	
	easeInBack: function(x) {
		return this.c3 * x * x * x - this.c1 * x * x;
	},
	
	easeInQuad: function(x) {
		return x * x;
	},
	
	add : function(obj, params, vis_on_end, speed, func) {
		
		
		//если уже идет анимация данного спрайта то отменяем ее
		for (var i=0;i<this.slot.length;i++)
			if (this.slot[i]!==null)
				if (this.slot[i].obj===params.obj)
					this.slot[i]=null;
		
		//ищем свободный слот для анимации
		for (var i = 0; i < this.slot.length; i++) {

			if (this.slot[i] === null) {

				obj.visible = true;
				obj.ready = false;

				//добавляем дельту к параметрам
				for (let key in params)
					params[key][2]=params[key][1]-params[key][0];

				this.slot[i] = {
					obj: obj,
					params: params,
					vis_on_end: vis_on_end,
					func: this[func].bind(anim),
					speed: speed,
					progress: 0,
					callback: params.callback
				};
				return;
			}
		}

	},
	
	process_func : function () {
		
		for (let key in params)
			params[key][2]=params[key][1]-params[key][0];
		
		
	},	
	
	process: function () {
		
		for (var i = 0; i < this.slot.length; i++)
		{
			if (this.slot[i] !== null) {
				
				let s=this.slot[i];
				for (let key in s.params)				
					s.obj[key]=s.params[key][0]+s.params[key][2]*s.func(s.progress);		
				s.progress+=s.speed;
				
				//если анимация завершилась то удаляем слот
				if (s.progress>=1) {
					for (let key in s.params)				
						s.obj[key]=s.params[key][1];
					
					s.obj.visible=s.vis_on_end;
					s.obj.ready=true;
					this.slot[i] = null;
				}
			}			
		}
		
	}
	
}

var keep_alive= function() {
			
	firebase.database().ref("players/"+my_data.uid+"/tm").set(firebase.database.ServerValue.TIMESTAMP);

}

var main_menu = {
	
	start_time:0,
	first_run:1,
	
	activate : function() {
		
		//puzzle_complete_message.show();
		
		//добавляем элементы главного меню
		anim.add_pos({obj: objects.main_buttons_cont,param: 'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});				
		anim.add_pos({obj: objects.main_header,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		
		
		//устанавливаем процессинговую функцию
		g_process=function(){main_menu.process()};
		
	},
	
	play_button_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active === 1 || activity_on === 1)
            return;
		
		game_res.resources.click.sound.play();
		
		//переходим в следующее меню
		menu2.activate(this.first_run);
		this.first_run=0;
		
		//убираем с экрана главное меню
		this.hide();		
		
	},
	
	lb_button_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active === 1  || activity_on === 1) {
			gres.locked.sound.play();
            return;
		}
		
		game_res.resources.click.sound.play();
		
		this.hide();
		lb.activate();
	},
	
	hide: function() {
				

		//убираем элементы главного меню
		anim.add_pos({obj: objects.main_buttons_cont,param: 'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03});
		anim.add_pos({obj: objects.main_header,param: 		'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03	});
		
	},
	
	close_rules_dialog: function() {
		
		if (objects.rules_cont.ready===false)
			return;
		
		gres.close.sound.play();
		
		any_dialog_active=0;
		
		anim.add_pos({obj: objects.rules_cont,param: 'x',vis_on_end: false,func: 'easeInBack',val: ['sx',-450],speed: 0.04});
		
	},
	
	rules_button_down: function() {
		
		if (objects.rules_cont.ready === false || any_dialog_active === 1  || activity_on === 1) {
			gres.locked.sound.play();
			return;
		}
			
		
		game_res.resources.click.sound.play();
		
		any_dialog_active=1;	
		
		gres.click.sound.play();
		
		anim.add_pos({obj: objects.rules_cont,param: 'x',vis_on_end: true,func: 'easeOutBack',val: [450,'sx'],speed: 0.02});
		
	},
	
	process: function() {			
		
		if (game_tick>this.start_time+5) {
			this.start_time=game_tick;
		}
	}
	
}

var menu2= {
	
	pic_load_error : 0,
			
	activate : function(init) {				
		
		//добавляем элементы  меню
		anim.add_pos({obj: objects.top_buttons_cont2,param: 'x',	vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});		
		anim.add_pos({obj: objects.buttons_cont2,param: 	'x',	vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});
		
		g_process=this.process;
		
		if (init===1) {
			this.change_board_down(5, 0);			
			this.set_random_pic(0);		
		}
		else {
			anim.add_pos({obj: objects.puzzle_img,param: 'alpha',		vis_on_end: true,func: 'linear',val: ['alpha',1],	speed: 0.03	});
		}		
		
		
		//обновляем рекорд
		objects.record_header.text = (my_data.record + 1 )+" сек.";
		
		
		//если ошибка при зазгрузе то показыаем кнопку бесплатной перезазгрузки
		if (this.pic_load_error === 1)
			objects.reload_bad_pic_button.visible=true;		
		
		
		//добавляем сетку картинки
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
		
		//обновляем размер и положение картинки
		objects.puzzle_img.x=puzzle.x;
		objects.puzzle_img.width=objects.puzzle_img.height=puzzle.width;		

		//показываем сколько осталось смен картинок
		objects.pic_changes_text.text=my_data.fpc;
		
		//получаем и отображаем глобальный топ игры чтобы потом использовать
		firebase.database().ref("players").orderByChild('record').limitToFirst(1).once('value').then((snapshot) => {
			
			let res = snapshot.val();
			if (res===null) {
			  console.log("Что-то не получилось получить данные о топе");
			}
			else {			
				
				let name = Object.keys(res);				
				global_record = res[name[0]].record;
			}
		});
		
	},
	
	set_random_pic: function(update_price=0) {
		
		activity_on = 1;
		
		PIXI.utils.TextureCache={};
		PIXI.utils.BaseTextureCache={};	
		objects.puzzle_img.texture=PIXI.Texture.BLACK;
		objects.puzzle_pic_updating.visible=true;
		
		
		
		
		//загружаем картинку из интернета
		let loader=new PIXI.Loader();
		loader.update_price=update_price;
		
		loader.add('puzzle_img', 'https://picsum.photos/400?id='+irnd(0,99999999),{loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE, timeout: 4000});
		loader.load((l, r) => {
						
			if (r.puzzle_img.texture.height===1) {
				
				console.log("Не получилось загрузить")
				objects.puzzle_pic_updating.visible=false;
				
				
				game_res.resources.blocked.sound.play();
				
				big_message.show('Ошибка','Не получилось загрузить картинку','Побробуйте снова', function(){big_message.close()},null);
				
				//показываем кнопку бесплатной перезагрузки картинки
				objects.reload_bad_pic_button.visible=true;		
				
				this.pic_load_error=1;
			}
			else
			{
				
				this.pic_load_error=0;
				objects.puzzle_img.texture=r.puzzle_img.texture;
				anim.add_pos({obj: objects.puzzle_img,param: 'alpha',vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03});	
				objects.puzzle_pic_updating.visible=false;
							
				game_res.resources.popup.sound.play();
				
				//убираем кнопку бесплатной перезагрузки если она была
				objects.reload_bad_pic_button.visible=false;		
				
			}
			
			activity_on = 0;
		});						
	},
		
	change_pic_down: function() {	
	
		if (objects.buttons_cont2.ready===false || objects.puzzle_pic_updating.visible===true || any_dialog_active===1  || activity_on === 1)
			return;
		
		
		
		
		game_res.resources.click.sound.play();
		

		if (my_data.fpc<=0) {			
			pbd.show();
			return;
		}
		
		//обновляем количество 
		my_data.fpc --;
		objects.pic_changes_text.text=my_data.fpc;	
		firebase.database().ref("players/"+my_data.uid+"/fpc").set(my_data.fpc);
		
		this.set_random_pic(1);		
	},
	
	start_down: function() {
		
		if (objects.buttons_cont2.ready === false || objects.puzzle_pic_updating.visible === true || any_dialog_active === 1 || this.pic_load_error === 1 || activity_on === 1)
			return;
		
		game_res.resources.click.sound.play();
		
		this.close();
		game.activate();
		
	},
	
	change_board_down : function(size, user_action = 1) {
		
		
		if (any_dialog_active === 1 || this.pic_load_error === 1 || activity_on === 1)
			return;
		
		if (user_action === 1)
			game_res.resources.click2.sound.play();
		
		//если нажали на туже сетку то выходим
		if (size===puzzle.size)
			return;
		
		
		if (size === 5)
			objects.puzzle_info.text='В данном режиме\nдоступна бонусная игра!'
		else
			objects.puzzle_info.text='Бонусная игра\nв данном режиме не доступна!'
		
		let old_width=objects['net_'+puzzle.size].width;

		//снчала скрываем старую сеть
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: false,func: 'linear',val: [1,0],	speed: 0.03	});

		//устанавливаем и пересчитываем параметры паззла
		puzzle.set_size(size);	

		//появление новой сетки
		//anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});

		//обновляем размер и положение картинки		
		anim2.add(objects.puzzle_img,{
			x:[objects.puzzle_img.x,puzzle.x],
			y:[objects.puzzle_img.y,puzzle.y],
			width:[objects.puzzle_img.width,puzzle.width],
			height:[objects.puzzle_img.height,puzzle.width],			
		}, true, 0.03,'easeOutBack');
		
		//обновляем размер и положение маски
		anim2.add(objects.image_mask,{
			x:[objects.puzzle_img.x,puzzle.x],
			y:[objects.puzzle_img.y,puzzle.y],
			width:[objects.puzzle_img.width,puzzle.width],
			height:[objects.puzzle_img.height,puzzle.width],			
		}, true, 0.03,'easeOutBack');
			
		
		//обновляем размер и положение сетки		
		anim2.add(objects['net_'+puzzle.size],{
			width:[old_width,objects['net_'+puzzle.size].width],
			height:[old_width,objects['net_'+puzzle.size].width],
			alpha: [0,1]
		}, true, 0.03,'easeOutBack');
		
				
		//устанавливаем фрейм
		objects.selection_frame.x=objects['f'+puzzle.size+'_button'].x;


	},
	
	back_button_down : function() {
		
		if (objects.puzzle_pic_updating.visible===true || objects.puzzle_img.ready===false || any_dialog_active===1 || activity_on === 1)
			return;
		
		game_res.resources.click.sound.play();
		
		this.close();
		main_menu.activate();
		
	},
	
	reload_bad_pic : function () {
		
		game_res.resources.click.sound.play();
		this.set_random_pic(0);	
		
	},
	
	close : function() {
		
		//убираем бесплатную перезагрузку картинки
		objects.reload_bad_pic_button.visible=false;
		
		//убираем элементы  меню
		anim.add_pos({obj: objects.top_buttons_cont2,param: 'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03});		
		anim.add_pos({obj: objects.buttons_cont2,param: 'x',		vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03	});
		
		//убираем сетку
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: false,func: 'linear',val: [1,0],	speed: 0.03	});
		
		//убираем картинку паззла так как потом ее заменит ячейки
		anim.add_pos({obj: objects.puzzle_img,param: 'alpha',		vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});
		
	},
	
	process :function () {
		if (objects.puzzle_pic_updating.visible===true) {			
			objects.puzzle_pic_updating.rotation+=0.15;			
		}
		
		
	}
	
}

var	show_ad=function(){
		
	if (game_platform==="YANDEX") {			
		//показываем рекламу
		window.ysdk.adv.showFullscreenAdv({
		  callbacks: {
			onClose: function() {}, 
			onError: function() {}
					}
		})
	}
	
	if (game_platform==="VK") {
				 
		vkBridge.send("VKWebAppShowNativeAds", {ad_format:"interstitial"})
		.then(data => console.log(data.result))
		.catch(error => console.log(error));	
	}		
}

var game = {

	start_time: 0,
	timer : 0,
	bonus : 1,
	time_result : 0,
	start_time : 0,
	change_pic_on_exit: 0,
	progress_range_time : 0,
	last_time_reward : 0,
	finish_params : {3 :[30,0.025], 4:[25,0.03], 5:[20,0.035]},
    process: function () {},

    activate: function () {
		
		
		
		
		game_res.resources.game_start.sound.play();
		
		//просто показываем все ячейки в правильном порядке
		puzzle.init();
				
		//перемешиваем паззлы		
		puzzle.shuffle();
		
		//добавляем сетку картинки
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
			
			
		//добавляем кнопки
		anim.add_pos({obj: objects.game_buttons_cont,param:	'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});
		
				
		//добавляем прогресс 
		if (puzzle.size === 5) {
			
			anim.add_pos({obj: objects.progress_cont,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});			
			
			this.progress_range_time = my_data.record*1.2;
			
			objects.my_record_point.x=30 + 370 * my_data.record/this.progress_range_time;
			objects.my_record_point.y=40;
			
			objects.top_record_point.x=30 + 370 * global_record/this.progress_range_time;
			objects.top_record_point.y=0;
			
			objects.time_slider.scale.x = 0;
			
			
			
		}

		this.change_pic_on_exit = 0;
			
		//фиксируем начало игры
		game.start_time=game_tick;		
	
		//утсанавливаем процессинговую функцию
		g_process=function(){game.process()};			
		
		
		//показываем сколько подсказок есть
		objects.hint_button_text.text=puzzle.hints_amount;

	
		//устанавливаем начальные значения завершенных паззлов
		objects.complete_counter.text = "Завершено: 0%";

		//бонус акивирован но он может быть отменен по ходу игры
		this.bonus = 1;
		
		objects.main_bcg.visible = false;
		objects.mask_bcg.visible = true;
		objects.mask_bcg.texture = gres['mask_bcg'+puzzle.size].texture;
				

	},
		
	back_button_down: function() {
		
		if (any_dialog_active===1 || activity_on==1)
			return;
		
		game_res.resources.lose.sound.play();
		
		puzzle.start_back_shuffle();
		big_message.show('Конец', 'Вы отменили игру!\n(((', '');
		cur_progress =-1;
		this.close();
		menu2.activate(this.change_pic_on_exit);
	},
	
	hint_button_down: function () {		
	
		if (any_dialog_active===1 || activity_on==1)
			return;
		
		//this.process_finish(1);
	
		if (puzzle.show_hint()===true) {
			
			game_res.resources.hint.sound.play();
			objects.hint_button_text.text=puzzle.hints_amount;			
		} else {
			
			game_res.resources.blocked.sound.play();
		}

	},
	
	process : function () {
		
		//показыаем прогресс только для картинки 5х5
		if (puzzle.size !== 5)
			return;
		

		//вычисляем прогресс
		let sec_passes = game_tick - this.start_time;
			
		if (sec_passes > 40)
			this.change_pic_on_exit = 1;
		
		let perc = sec_passes / this.progress_range_time;

		if (perc < 1.001)
			objects.time_slider.scale.x =  perc;		
			
	},
	
	process_finish : function (init) {
		
		if (init === 1) {		

			activity_on=1;
		
			this.timer=0;
			
			this.time_result = Math.round(game_tick - this.start_time);
			
			objects.main_bcg.visible = true;
			objects.mask_bcg.visible = false;
		
			g_process=function(){game.process_finish(0)};
				
			//Скрываем сетку
			anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',	vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});
			
		}
		
		//постепенно убираем все карточки
		for (let p =0 ; p < puzzle.size * puzzle.size ; p ++) {						
			if (this.timer === (p*this.finish_params[puzzle.size][0]+90)) {
				
				//обновляем размер и положение картинки		
				anim2.add(objects.puzzle_cells[p],{
					rotation:[objects.puzzle_cells[p].rotation,0.8],
					x:[objects.puzzle_cells[p].x,-100],		
					y:[objects.puzzle_cells[p].y,objects.puzzle_cells[p].y-100],							
				}, false, this.finish_params[puzzle.size][1], 'easeInQuad');		
				
				game_res.resources.fin.sound.play();
			}				
		}
				
		if (this.timer === puzzle.size * puzzle.size * this.finish_params[puzzle.size][0] + 90)
		{
								
			//анализируем результаты игры
			let res_data = this.process_game_results();
			
			//показываем сообщение
			puzzle_complete_message.show(res_data);					
			
			//делаем звук
			game_res.resources.win.sound.play();
		
			//убираем паззл
			puzzle.hide();
			
			//убираем игру
			game.close();		
		
			activity_on=0;		
		}		

		//обрабатываем кручение задней картинки
		puzzle_complete_message.process();
		
		this.timer++;
	},
	
	process_game_results : function () {
		
		let my_new_record = 0;
		let game_new_record = 0;
		let is_bonus_game = 0;
		let is_bonus_received = 0;
		
		//это бонусная игра
		if (puzzle.size === 5) {
				
			//если новый личный рекорд
			if (this.time_result < my_data.record) {	
			
				//добавить новый рекорд
				my_data.record=this.time_result;
				
				my_new_record = 1;
				
				//записываем в файербейс
				firebase.database().ref("players/"+my_data.uid+"/record").set(my_data.record);
			}	
			
			//если новый глобальный рекорд
			if (this.time_result < global_record) {	
			
				//добавить новый рекорд
				global_record=this.time_result;
				
				game_new_record = 1;					
			}			

		} 		

		return {my_new_record :my_new_record, game_new_record:game_new_record, is_bonus_game :is_bonus_game, is_bonus_received : is_bonus_received}
	},
		
	made_a_swap : function () {
		
		this.start_time -= 1; 
		
	},
	
	close: function() {		
	
	
		//убираем кнопки
		anim.add_pos({obj: objects.game_buttons_cont,param: 		'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03	});
				
		//убираем бонусный прогресс если он есть
		if (objects.progress_cont.visible === true)
			anim.add_pos({obj: objects.progress_cont,param: 		'x',vis_on_end: false,func: 'linear',val: ['x',-450],	speed: 0.03	});		

	}
	
}

var puzzle_complete_message= {
	
	show : function(params = {my_new_record :0, game_new_record:0, is_bonus_game :0, is_bonus_received : 0}) {
								
		//показыаем шкалу достижений
		if (params.is_bonus_game === 1) {
			
			
			if (params.is_bonus_received === 1) {				
				objects.game_complete_0.text="Пазл собран!\nВы уложились в бонусное время!";				
				objects.game_complete_1.text="";						
			} else {
				
				objects.game_complete_0.text="Пазл собран!\nНо бонус и прогресс потеряны(((";	
				objects.game_complete_1.text="";				
			}
			
			
		}
				
		if (params.is_bonus_game === 0) {
			
						
			objects.game_complete_0.text="";	
			objects.game_complete_1.text="Пазл собран!!!";	
		}
				
		//проверяем личный новый рекорд
		if (params.my_new_record === 1) {
			setTimeout(function() {
				game_res.resources.new_record.sound.play();
				mini_message.show("Новый личный рекорд!");						
			},700)
		}
		
		//проверяем глобальный рекорд
		if (params.game_new_record === 1) {
			setTimeout(function() {
				game_res.resources.new_record2.sound.play();
				mini_message.show("Новый рекорд игры!");						
			},1500)
		}		
					
		
		//добавляем дополнение к радуге если новые рекорды
		if (params.my_new_record === 1 || params.game_new_record === 1) {			
			anim2.add(objects.rainbow2,{
				rotation:[0,1.2],
				alpha:[0,1]
			}, true, 0.003,'easeOutBack');
			
			anim.add_scl({obj: objects.rainbow2,param: 'x',vis_on_end: true,func: 'easeOutBack',val: [0,1],	speed: 0.003});
			anim.add_scl({obj: objects.rainbow2,param: 'y',vis_on_end: true,func: 'easeOutBack',val: [0,1],	speed: 0.003});			
		}


		//записываем событие
		firebase.database().ref("players/"+my_data.uid+"/tm").set(firebase.database.ServerValue.TIMESTAMP);
				
		anim.add_pos({obj: objects.game_complete_cont,param: 'x',		vis_on_end: true,func: 'easeOutBack',val: [-500,'sx'],	speed: 0.03	});
		anim.add_pos({obj: objects.rainbow,param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
		
		any_dialog_active=1;
	},
	
	close : function () {
		
		any_dialog_active=0;		
		anim.add_pos({obj: objects.game_complete_cont,param: 'x',		vis_on_end: false,func: 'easeInBack',val: ['sx',500],	speed: 0.03	});
		anim.add_pos({obj: objects.rainbow,param: 'alpha',		vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});
		
		if (objects.rainbow2.visible === true){
			anim2.kill_anim(objects.rainbow2);
			anim.add_pos({obj: objects.rainbow2, param: 'alpha',		vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});			
		}

		
		//активируем меню
		menu2.activate(1);	
		
		//показыаем рекламу
		show_ad();
				
		
		game_res.resources.close.sound.play();
	},
	
	process : function () {
		if (objects.rainbow.visible===true)
			objects.rainbow.rotation+=0.03;

	},
	
	vk_invite_down: function() {
		
        if (objects.game_complete_cont.ready === false) {
			gres.blocked.sound.play();
            return;
		}
		
		if (game_platform==='VK')
			vkBridge.send('VKWebAppShowInviteBox');
	},
	
	vk_post_down: function() {
		
        if (objects.game_complete_cont.ready === false) {
			gres.blocked.sound.play();
            return;
		}
		
		if (game_platform==='VK')
			vkBridge.send('VKWebAppShowWallPostBox', {"message": `Я собраз пазл 5х5 за ${my_data.record} секунд. А за сколько сможешь ты?`,
			"attachments": "https://vk.com/app7729354"});
	}
	
}

function vis_change() {
	
	if (document.hidden===true) {
		//game.process_finish_game(1,0);
	}	
}

var auth = function() {
	
	return new Promise((resolve, reject)=>{

		let help_obj = {

			loadScript : function(src) {
			  return new Promise((resolve, reject) => {
				const script = document.createElement('script')
				script.type = 'text/javascript'
				script.onload = resolve
				script.onerror = reject
				script.src = src
				document.head.appendChild(script)
			  })
			},

			init: function() {

				g_process=function() { help_obj.process()};

				let s = window.location.href;

				//-----------ЯНДЕКС------------------------------------
				if (s.includes("yandex")) {
					game_platform="YANDEX";
					Promise.all([
						this.loadScript('https://yandex.ru/games/sdk/v2')
					]).then(function(){
						help_obj.yandex();
					}).catch(function(e){
						alert(e);
					});
					return;
				}


				//-----------ВКОНТАКТЕ------------------------------------
				if (s.includes("vk.com")) {
					game_platform="VK";
					Promise.all([
						this.loadScript('https://vk.com/js/api/xd_connection.js?2'),
						this.loadScript('//ad.mail.ru/static/admanhtml/rbadman-html5.min.js'),
						this.loadScript('//vk.com/js/api/adman_init.js'),
						this.loadScript('https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js')

					]).then(function(){
						help_obj.vk()
					}).catch(function(e){
						alert(e);
					});
					return;
				}

				//-----------ЛОКАЛЬНЫЙ СЕРВЕР--------------------------------
				if (s.includes("192.168")) {
					game_platform="debug";
					help_obj.debug();
					return;
				}

				//-----------НЕИЗВЕСТНОЕ ОКРУЖЕНИЕ---------------------------
				game_platform="unknown";
				help_obj.unknown();

			},

			yandex: function() {

				if(typeof(YaGames)==='undefined')
				{
					help_obj.local();
				}
				else
				{
					//если sdk яндекса найден
					YaGames.init({}).then(ysdk => {

						//фиксируем SDK в глобальной переменной
						window.ysdk=ysdk;

						//запрашиваем данные игрока
						return ysdk.getPlayer();


					}).then((_player)=>{

						my_data.name 	= _player.getName();
						my_data.uid 	= _player.getUniqueID().replace(/\//g, "Z");
						my_data.pic_url = _player.getPhoto('medium');

						//console.log(`Получены данные игрока от яндекса:\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);

						//если личные данные не получены то берем первые несколько букв айди
						if (my_data.name=="" || my_data.name=='')
							my_data.name=my_data.uid.substring(0,5);

						help_obj.process_results();

					}).catch((err)=>{
						
						//загружаем из локального хранилища если нет авторизации в яндексе
						help_obj.local();

					})
				}
			},

			vk: function() {


				//vkBridge.subscribe((e) => this.vkbridge_events(e));
				vkBridge.send('VKWebAppInit').then(()=>{
					
					return vkBridge.send('VKWebAppGetUserInfo');
					
				}).then((e)=>{
					
					my_data.name 	= e.first_name + ' ' + e.last_name;
					my_data.uid 	= "vk"+e.id;
					my_data.pic_url = e.photo_100;

					//console.log(`Получены данные игрока от VB MINIAPP:\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);
					help_obj.process_results();		
					
				}).catch(function(e){
					
					alert(e);
					
				});
				

			},

			debug: function() {

				let uid = prompt('Отладка. Введите ID', 100);

				my_data.name = my_data.uid = "debug" + uid;
				my_data.pic_url = "https://sun9-73.userapi.com/impf/c622324/v622324558/3cb82/RDsdJ1yXscg.jpg?size=223x339&quality=96&sign=fa6f8247608c200161d482326aa4723c&type=album";

				help_obj.process_results();

			},

			local: function(repeat = 0) {

				//ищем в локальном хранилище
				let local_uid = localStorage.getItem('uid');

				//здесь создаем нового игрока в локальном хранилище
				if (local_uid===undefined || local_uid===null) {

					//console.log("Создаем нового локального пользователя");

					let rnd_names=["Бегемот","Жираф","Зебра","Тигр","Ослик","Мамонт","Волк","Лиса","Мышь","Сова","Слон","Енот","Кролик","Бизон","Пантера"];
					let rnd_num=Math.floor(Math.random()*rnd_names.length)
					let rand_uid=Math.floor(Math.random() * 9999999);

					my_data.name 		=	rnd_names[rnd_num]+rand_uid;
					my_data.rating 		= 	1400;
					my_data.uid			=	"ls"+rand_uid;
					my_data.pic_url		=	'https://avatars.dicebear.com/v2/male/'+irnd(10,10000)+'.svg';

					localStorage.setItem('uid',my_data.uid);
					help_obj.process_results();
				}
				else
				{
					//console.log(`Нашли айди в ЛХ (${local_uid}). Загружаем остальное из ФБ...`);
					
					my_data.uid = local_uid;	
					
					//запрашиваем мою информацию из бд или заносим в бд новые данные если игрока нет в бд
					firebase.database().ref("players/"+my_data.uid).once('value').then((snapshot) => {		
									
						var data=snapshot.val();
						
						//если на сервере нет таких данных
						if (data === null) {
													
							//если повтоно нету данных то выводим предупреждение
							if (repeat === 1)
								alert('Какая-то ошибка');
							
							//console.log(`Нашли данные в ЛХ но не нашли в ФБ, повторный локальный запрос...`);	

							
							//повторно запускаем локальный поиск						
							localStorage.clear();
							help_obj.local(1);	
								
							
						} else {						
							
							my_data.pic_url = data.pic_url;
							my_data.name = data.name;
							help_obj.process_results();
						}

					})	

				}


			},

			unknown: function () {

				alert("Неизвестная платформа! Кто Вы?")

				//загружаем из локального хранилища
				help_obj.local();
			},

			process_results: function() {


				//отображаем итоговые данные
				//console.log(`Итоговые данные:\nПлатформа:${game_platform}\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);

				//обновляем базовые данные в файербейс так могло что-то поменяться
				firebase.database().ref("players/"+my_data.uid+"/name").set(my_data.name);
				firebase.database().ref("players/"+my_data.uid+"/pic_url").set(my_data.pic_url);
				firebase.database().ref("players/"+my_data.uid+"/tm").set(firebase.database.ServerValue.TIMESTAMP);

				//вызываем коллбэк
				resolve("ok");
			},

			process : function () {

				objects.id_loup.x=20*Math.sin(game_tick*8)+90;
				objects.id_loup.y=20*Math.cos(game_tick*8)+110;
			}
		}

		help_obj.init();

	});	
	
}

var lb={
	
	add_game_to_vk_menu_shown:0,
	cards_pos: [[20,300],[20,355],[20,410],[20,465],[20,520],[20,575],[20,630]],
	
	activate: function() {
			
		

		anim.add_pos({obj:objects.lb_cards_cont,param:'x',vis_on_end:true,func:'linear',val:[450,0],	speed:0.03});
		
		objects.lb_cards_cont.visible=true;
		objects.lb_back_button.visible=true;
		
		for (let i=0;i<7;i++) {			
			objects.lb_cards[i].x=this.cards_pos[i][0];
			objects.lb_cards[i].y=this.cards_pos[i][1];	
			objects.lb_cards[i].place.text=(i+4)+".";			
		}		
		
		this.update();		
	},
	
	close: function() {
				
				
		anim.add_pos({obj:objects.lb_1_cont,param:'x',vis_on_end:false,func:'linear',val:['x',-450],	speed:0.03});
		anim.add_pos({obj:objects.lb_2_cont,param:'x',vis_on_end:false,func:'linear',val:['x',-450],	speed:0.03});
		anim.add_pos({obj:objects.lb_3_cont,param:'x',vis_on_end:false,func:'linear',val:['x',-450],	speed:0.03});
		anim.add_pos({obj:objects.lb_cards_cont,param:'x',vis_on_end:false,func:'linear',val:['x',-450],	speed:0.03});
				
				
	
		//gres.close.sound.play();
		
		
		//показываем меню по выводу игры в меню
		if (this.add_game_to_vk_menu_shown===1)
			return;
		
		if (game_platform==='VK')
			vkBridge.send('VKWebAppAddToFavorites');
		
		this.add_game_to_vk_menu_shown=1;
		
	},
	
	back_button_down: function() {
		
		if (any_dialog_active===1 || objects.lb_1_cont.ready===false) {
			game_res.resources.locked.sound.play();
			return
		};	
		
		
		game_res.resources.click.sound.play();
		
		this.close();
		main_menu.activate();
		
	},
	
	update: function () {
		
		
		firebase.database().ref("players").orderByChild('record').limitToFirst(25).once('value').then((snapshot) => {
			
			if (snapshot.val()===null) {
			  console.log("Что-то не получилось получить данные о рейтингах");
			}
			else {				
				
				var players_array = [];
				snapshot.forEach(players_data=> {			
					if (players_data.val().name!=="" && players_data.val().name!=='')
						players_array.push([players_data.val().name, players_data.val().record, players_data.val().pic_url]);	
				});
				

				players_array.sort(function(a, b) {	return a[1] - b[1];});
				
				
				//загружаем аватары
				var loader = new PIXI.Loader();
								
				var len=Math.min(10,players_array.length);
				
				//загружаем тройку лучших
				for (let i=0;i<3;i++) {
					let fname=players_array[i][0];					
					make_text(objects['lb_'+(i+1)+'_name'],fname,180);
										
					//objects['lb_'+(i+1)+'_name'].text=fname;
					objects['lb_'+(i+1)+'_balance'].text=(players_array[i][1]+1)+ " сек.";					
					
					
					let pic_url = players_array[i][2];
					
					//меняем адрес который невозможно загрузить
					if (pic_url==="https://vk.com/images/camera_100.png")
						pic_url = "https://i.ibb.co/fpZ8tg2/vk.jpg";					
					
					loader.add('leaders_avatar_'+i, pic_url, {loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE, timeout: 4000});
				};
				
				//загружаем остальных
				for (let i=3;i<10;i++) {
					let fname=players_array[i][0];	
					//objects.lb_cards[i-3].full_name=fname;
					
					make_text(objects.lb_cards[i-3],fname,180);
					
					objects.lb_cards[i-3].name.text=fname;
					objects.lb_cards[i-3].record.text=(players_array[i][1]+1)+ " сек.";	;					
					loader.add('leaders_avatar_'+i, players_array[i][2],{loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE, timeout: 3000});					
					
				};
				
				
				
				loader.load((loader, resources) => {
					

					for (let i=0;i<3;i++)
						objects['lb_'+(i+1)+'_avatar'].texture=resources['leaders_avatar_'+i].texture;						

					objects.lb_1_cont.cacheAsBitmap  = true;
					objects.lb_2_cont.cacheAsBitmap  = true;
					objects.lb_3_cont.cacheAsBitmap  = true;		

					anim.add_pos({obj:objects.lb_1_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});
					anim.add_pos({obj:objects.lb_2_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});
					anim.add_pos({obj:objects.lb_3_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});					
					
					for (let i=3;i<10;i++)						
						objects.lb_cards[i-3].avatar.texture=resources['leaders_avatar_'+i].texture;

				});
			}

		});
		
	}
	
}

function init_game_env() {
			
			
	//инициируем файербейс
	if (firebase.apps.length===0) {
		firebase.initializeApp({
			apiKey: "AIzaSyDUYz_Rylw18_CG5Oiop8fb6OYpUaR3FKw",
			authDomain: "puzzle-db6c5.firebaseapp.com",
			databaseURL: "https://puzzle-db6c5-default-rtdb.europe-west1.firebasedatabase.app",
			projectId: "puzzle-db6c5",
			storageBucket: "puzzle-db6c5.appspot.com",
			messagingSenderId: "362880721960",
			appId: "1:362880721960:web:77016026f53c967b84011d"
		});
	}
						
	document.getElementById("m_bar").outerHTML = "";
    document.getElementById("m_progress").outerHTML = "";
	document.body.style.backgroundImage = "url('https://github.com/akukamil/puzzle/blob/main/bcg_main.jpg?raw=true')";

	//короткое обращение к ресурсам
	gres=game_res.resources;

    app = new PIXI.Application({width: M_WIDTH, height: M_HEIGHT, antialias: false, forceCanvas: false, backgroundAlpha:0});
    document.body.appendChild(app.view);

    var resize = function () {
        const vpw = window.innerWidth; // Width of the viewport
        const vph = window.innerHeight; // Height of the viewport
        let nvw; // New game width
        let nvh; // New game height

        if (vph / vpw < M_HEIGHT / M_WIDTH) {
            nvh = vph;
            nvw = (nvh * M_WIDTH) / M_HEIGHT;
        } else {
            nvw = vpw;
            nvh = (nvw * M_HEIGHT) / M_WIDTH;
        }
        app.renderer.resize(nvw, nvh);
        app.stage.scale.set(nvw / M_WIDTH, nvh / M_HEIGHT);
    }

    resize();
    window.addEventListener("resize", resize);

    //создаем спрайты и массивы спрайтов и запускаем первую часть кода
    for (var i = 0; i < load_list.length; i++) {
        const obj_class = load_list[i].class;
        const obj_name = load_list[i].name;

        switch (obj_class) {
        case "sprite":
            objects[obj_name] = new PIXI.Sprite(game_res.resources[obj_name].texture);
            eval(load_list[i].code0);
            break;

        case "block":
            eval(load_list[i].code0);
            break;

        case "cont":
            eval(load_list[i].code0);
            break;

        case "array":
			var a_size=load_list[i].size;
			objects[obj_name]=[];
			for (var n=0;n<a_size;n++)
				eval(load_list[i].code0);
            break;
        }
    }

    //обрабатываем вторую часть кода в объектах
    for (var i = 0; i < load_list.length; i++) {
        const obj_class = load_list[i].class;
        const obj_name = load_list[i].name;

        switch (obj_class) {
        case "sprite":
            eval(load_list[i].code1);
            break;

        case "block":
            eval(load_list[i].code1);
            break;

        case "cont":	
			eval(load_list[i].code1);
            break;

        case "array":
			var a_size=load_list[i].size;
				for (var n=0;n<a_size;n++)
					eval(load_list[i].code1);	;
            break;
        }
    }
	
	//загружаем данные
    auth().then((val)=> {
		
		return new Promise(function(resolve, reject) {
			let loader=new PIXI.Loader();
			loader.add("my_avatar", my_data.pic_url,{loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE, timeout: 5000});						
			loader.load(function(l,r) {	resolve(l) });
		});
		
	}).then((loader)=> {		
		
		objects.id_avatar.texture=loader.resources.my_avatar.texture;		
		make_text(objects.id_name,my_data.name,150);
		
		return firebase.database().ref("players/"+my_data.uid).once('value');
		
	}).then((snapshot)=>{
		
		let data=snapshot.val();
		
		
		
		if (data.record === undefined)
			my_data.record = 300;
		else
			my_data.record = data.record;
		
		if (data.fpc === undefined)
			my_data.fpc = 10;
		else
			my_data.fpc = data.fpc;
		
				
		//обновляем данные в файербейс так как это мог быть новый игрок и у него должны быть занесены все данные
		firebase.database().ref("players/"+my_data.uid+"/record").set(my_data.record);
		
		//устанавливаем баланс в попап
		objects.id_record.text=(my_data.record+1);	
		
		//устанавливаем имя в верхнюю строчку
		objects.my_name.text=my_data.name;	
		
		//убираем кнопки вконтакте если мы не вконтакте
		if (game_platform!=="VK") {
			objects.vk_invite_button.visible = false;
			objects.vk_post_button.visible = false;			
		}			
			
		activity_on=0;	
		
		return new Promise((resolve, reject) => {
			setTimeout(resolve, 1500);
		});
		
	}).then(()=>{		
		anim.add_pos({obj: objects.id_cont,param: 'y',vis_on_end: false,func: 'easeInBack',val: ['y',-200],	speed: 0.03});		
	}).catch(function(e){
		alert(e);
	});
		
	//запускаем главное меню
	main_menu.activate();
	
    //запускаем главный цикл
    main_loop();
}

function load_resources() {


    game_res = new PIXI.Loader();
	
	
	let git_src="https://akukamil.github.io/puzzle/"
	//let git_src=""
	

	game_res.add("m2_font", git_src+"m_font.fnt");


    //добавляем из листа загрузки
    for (var i = 0; i < load_list.length; i++) {
		
        if (load_list[i].class === "sprite" )
            game_res.add(load_list[i].name, git_src+"res/" + load_list[i].name + "." +  load_list[i].image_format);		
		
        if (load_list[i].class === "image")
            game_res.add(load_list[i].name, git_src+"res/" + load_list[i].name + "." +  load_list[i].image_format);
		
	}

		
	game_res.add('popup',git_src+'popup.mp3');
	game_res.add('click',git_src+'click.mp3');
	game_res.add('click2',git_src+'click2.mp3');
	game_res.add('close',git_src+'close.mp3');
	game_res.add('lose',git_src+'lose.mp3');
	game_res.add('hint',git_src+'hint.mp3');
	game_res.add('bonus_lost',git_src+'bonus_lost.mp3');
	game_res.add('win',git_src+'win.mp3');
	game_res.add('move',git_src+'move.mp3');
	game_res.add('move_out',git_src+'move_out.mp3');
	game_res.add('move_sel',git_src+'move_sel.mp3');
	game_res.add('new_record',git_src+'new_record.mp3');
	game_res.add('new_record2',git_src+'new_record2.mp3');
	
	
	game_res.add('blocked',git_src+'blocked.mp3');
	game_res.add('open',git_src+'open.mp3');
	game_res.add('open2',git_src+'open2.mp3');
	game_res.add('fin',git_src+'fin.mp3');
	game_res.add('game_start',git_src+'game_start.mp3');

    game_res.load(init_game_env);
    game_res.onProgress.add(progress);

    function resize_screen() {
        const vpw = window.innerWidth; // Width of the viewport
        const vph = window.innerHeight; // Height of the viewport
        let nvw; // New game width
        let nvh; // New game height

        if (vph / vpw < M_HEIGHT / M_WIDTH) {
            nvh = vph;
            nvw = (nvh * M_WIDTH) / M_HEIGHT;
        } else {
            nvw = vpw;
            nvh = (nvw * M_HEIGHT) / M_WIDTH;
        }
        app.renderer.resize(nvw, nvh);
        app.stage.scale.set(nvw / M_WIDTH, nvh / M_HEIGHT);
    }

    function progress(loader, resource) {

        document.getElementById("m_bar").style.width = Math.round(loader.progress) + "%";
    }

}

function main_loop() {

    //глобальный процессинг
    g_process();
	
	puzzle.process();

	//обработка анимаций
    anim.process();
	anim2.process();
	
	//обрабатываем паззлы
	objects.puzzle_cells.forEach(item=>{
		item.process();
	})
	
    requestAnimationFrame(main_loop);
    game_tick += 0.01666666;
}

