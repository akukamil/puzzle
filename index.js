var M_WIDTH = 450, M_HEIGHT = 800;
var app, game_res, gres, objects = {}, my_data={};
var g_process = () => {};
var any_dialog_active = 0, game_tick=0, game_platform="", state="", pic_changes=10;


var p_data_x=[
{hints_amount:1, sec:50, sec_reward:10, swaps:10, swap_reward: 5},
{hints_amount:2, sec:90, sec_reward:30, swaps:20, swap_reward: 88},
{hints_amount:3, sec:150, sec_reward:100, swaps:40, swap_reward: 30},
]

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
		
		
		this.addChild(this.cell, this.cell_ok, this.cell_selected, this.hint);
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
		
		this.avatar=new PIXI.Sprite();
		this.avatar.x=40;
		this.avatar.y=10;
		this.avatar.width=this.avatar.height=48;
		
		
		this.name=new PIXI.BitmapText('Игорь Николаев', {fontName: 'Century Gothic', fontSize: 25});
		this.name.x=100;
		this.name.y=20;
		
	
		this.rating=new PIXI.BitmapText('1422', {fontName: 'Century Gothic', fontSize: 35});
		this.rating.x=300;
		this.rating.tint=0x00ffff;
		this.rating.y=20;		
		
		this.addChild(this.bcg,this.place, this.avatar, this.name, this.rating);		
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
		
		this.hints_amount =	p_data_x[this.size-3].hints_amount;
		
		this.width = this.cell_size *	this.size;	
		this.x = (450 - this.width) / 2;
		this.y=210 - (this.size-3)*10
	},
	
	init: function () {
		
		this.state="";
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
			
		this.state="";
		
	},
	
	start_back_shuffle: function() {
		
		//вычисляем данные для последующей перестановки
		for (let i=0;i<this.size*this.size;i++)
			objects.puzzle_cells[i].prepare_shuffle(i,this.size, this.cell_size, this.image_size);
		this.state="back_shuffling";
		this.tween_amount=0;
		
	},
		
	shuffle : function () {		
		this.prepare_shuffle();		
		this.state="init_shuffling";
		this.tween_amount=0;
	},
	
	show_hint: function () {
		
		if (this.state!=="game")
			return;
		
		
		if (this.hints_amount===0)
			return;
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
		
		if (this.state==="init_shuffling") {
			
			for (let i=0;i<this.size*this.size;i++)
				objects.puzzle_cells[i].move_to_target(this.tween_amount);
			this.tween_amount+=0.03;
			
			if (this.tween_amount>=1) {
				for (let i=0;i<this.size*this.size;i++)
					objects.puzzle_cells[i].finish_move();
				this.state="game";
			}			
		}
		
		if (this.state==="back_shuffling") {
			
			for (let i=0;i<this.size*this.size;i++)
				objects.puzzle_cells[i].move_to_target(this.tween_amount);
			this.tween_amount+=0.03;
			
			if (this.tween_amount>=1) {
				for (let i=0;i<this.size*this.size;i++) {
					objects.puzzle_cells[i].finish_move();				
					objects.puzzle_cells[i].visible=false;
				}
				this.state="";
			}			
		}

		if (this.state==="shuffling") {
			
			this.ec1.move_to_target(this.tween_amount);
			this.ec2.move_to_target(this.tween_amount);
			this.tween_amount+=0.025;
			
			if (this.tween_amount>=1) {
				this.tween_amount=0;
				this.ec1.finish_move();
				this.ec2.finish_move();
				
				//если целевая ячейка соответствует правильной то показываем на ячейке соответствующий значек
				if (this.ec1.cur_id===this.ec1.true_id) {
					anim.add_pos({obj: this.ec1.cell_ok,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.5],	speed: 0.03});					
					this.completed++;
				}
				
				if (this.ec2.cur_id===this.ec2.true_id) {
					anim.add_pos({obj: this.ec2.cell_ok,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.5],	speed: 0.03});					
					this.completed++;
				}

				//проверяем что паззл собран
				if (this.completed===(this.size*this.size))		
					game.puzzle_complete();
					

				this.state="game";
				
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
				
				
		if (this.state!=="game")
			return;
		
		//если выбрана завершенная ячейка то выходим
		if (objects.puzzle_cells[ind].cur_id===objects.puzzle_cells[ind].true_id)
			return;
		
		//если нажата таже ячейка то выходим
		if (this.ec1!==null) {
			if (ind===this.ec1.true_id) {
				anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: false,func: 'linear',val: [0.8,0],	speed: 0.05});	
				this.ec1=null;		
				return;
			}		
		}


		//если уже выделена одная ячейка
		if (this.ec1!==null) {
			
			//начинаем процесс перемещения клеток
			this.ec2=objects.puzzle_cells[ind];
			
			anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: false,func: 'easeOutBack',val: [0.8,0],	speed: 0.05});	
			
			this.ec1.prepare_shuffle(this.ec2.cur_id,this.size, this.cell_size, this.image_size);
			this.ec2.prepare_shuffle(this.ec1.cur_id,this.size, this.cell_size, this.image_size);
			
			//сообщаем в игру что сдела своп
			game.made_a_swap();
			
			this.state="shuffling";
			this.tween_amount=0;
			
		} else {					
			this.ec1=objects.puzzle_cells[ind];
			anim.add_pos({obj: this.ec1.cell_selected,param: 'alpha',vis_on_end: true,func: 'easeOutBack',val: [0,0.8],	speed: 0.05});	
		}	
	}
	

}

var cut_string = function(s,f_size, max_width) {
	
	let sum_v=0;
	for (let i=0;i<s.length;i++) {
		
		let code_id=s.charCodeAt(i);
		let char_obj=game_res.resources.m2_font.bitmapFont.chars[code_id];
		if (char_obj===undefined) {
			char_obj=game_res.resources.m2_font.bitmapFont.chars[83];			
			s = s.substring(0, i) + 'S' + s.substring(i + 1);
		}		

		sum_v+=char_obj.xAdvance*f_size/64;	
		if (sum_v>max_width)
			return s.substring(0,i-1)+"...";		
	}
	return s
	
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
		
		
		any_dialog_active=0;
		anim.add_pos({obj:objects.big_message_cont,param:'y',vis_on_end:false,func:'easeInBack',val:['sy', 	800],	speed:0.05});
		
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
	
	add : function(obj, params, vis_on_end, speed) {
		
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
					func: this.linear.bind(anim),
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
					s.obj[key]=s.params[key][0]+s.params[key][2]*s.progress;		
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
		
		//добавляем элементы главного меню
		anim.add_pos({obj: objects.main_buttons_cont,param: 'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});
				
		anim.add_pos({obj: objects.main_header,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		
		//big_message.show('Ошибка', 'Привет', 'Опять привет');
		
		//устанавливаем процессинговую функцию
		g_process=function(){main_menu.process()};
		
		
	},
	
	play_button_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active===1)
            return;
		
		//убираем с экрана главное меню
		this.hide();
		
		//переходим в следующее меню
		menu2.activate(this.first_run);
		this.first_run=0;
		
	},
	
	lb_button_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active===1) {
			gres.locked.sound.play();
            return;
		}
		
		//gres.click.sound.play();
		
		this.hide();
		lb.activate();
	},
	
	hide: function() {
				

		//убираем элементы главного меню
		anim.add_pos({obj: objects.main_buttons_cont,param: 'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03});
		anim.add_pos({obj: objects.main_header,param: 		'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03	});
		
	},
	
	rules_ok_down: function() {
		
		if (objects.rules_cont.ready===false)
			return;
		
		gres.close.sound.play();
		
		any_dialog_active=0;
		
		anim.add_pos({obj: objects.rules_cont,param: 'y',vis_on_end: false,func: 'easeInBack',val: ['sy',450],speed: 0.04});
		
	},
	
	rules_button_down: function() {
		
		if (objects.rules_cont.ready===false || any_dialog_active===1) {
			gres.locked.sound.play();
			return;
		}
			
		
		any_dialog_active=1;	
		
		gres.click.sound.play();
		
		anim.add_pos({obj: objects.rules_cont,param: 'y',vis_on_end: true,func: 'easeOutBack',val: [450,'sy'],speed: 0.02});
		
	},
	
	process: function() {			
		
		if (game_tick>this.start_time+5) {
			this.start_time=game_tick;
		}
	},
	
	invite_friends_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active===1) {
			gres.locked.sound.play();
            return;
		}
		
		if (game_platform==='VK_WEB' || game_platform==='VK_MINIAPP')
			vkBridge.send('VKWebAppShowInviteBox');
	},
	
	vk_post_down: function() {
		
        if (objects.main_buttons_cont.ready === false || any_dialog_active===1) {
			gres.locked.sound.play();
            return;
		}
		
		if (game_platform==='VK_WEB' || game_platform==='VK_MINIAPP')
			vkBridge.send('VKWebAppShowWallPostBox', {"message": `Мой рейтинг в игре Стикмэны-Дуэль ${my_data.rating}. А сколько наберешь ты?`});
	}
	
}

var menu2= {
			
	activate : function(init) {				
		
		//добавляем элементы  меню
		anim.add_pos({obj: objects.top_buttons_cont2,param: 'x',	vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});		
		anim.add_pos({obj: objects.buttons_cont2,param: 	'x',	vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03});
		
		g_process=this.process;
		
		if (init===1) {
			this.change_board_down(4);			
			this.set_random_pic(0);		
		}
		else {
			anim.add_pos({obj: objects.puzzle_img,param: 'alpha',		vis_on_end: true,func: 'linear',val: ['alpha',1],	speed: 0.03	});
		}		
		
		//добавляем сетку картинки
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
		
		//обновляем размер и положение картинки
		objects.puzzle_img.x=puzzle.x;
		objects.puzzle_img.width=objects.puzzle_img.height=puzzle.width;		

		//показываем сколько осталось смен картинок
		objects.pic_changes_text.text=pic_changes;
		
	},
	
	set_random_pic: function(update_price=0) {
		
		PIXI.utils.TextureCache={};
		PIXI.utils.BaseTextureCache={};	
		objects.puzzle_img.texture=PIXI.Texture.BLACK;
		objects.puzzle_pic_updating.visible=true;
		
		//загружаем картинку из интернета
		let loader=new PIXI.Loader();
		loader.update_price=update_price;
		
		loader.add('puzzle_img', 'https://picsum.photos/400?id='+irnd(0,99999999),{loadType: PIXI.LoaderResource.LOAD_TYPE.IMAGE, timeout: 3000});
		loader.load((loader, resources) => {
			objects.puzzle_img.texture=resources['puzzle_img'].texture;
			anim.add_pos({obj: objects.puzzle_img,param: 'alpha',vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03});	
			objects.puzzle_pic_updating.visible=false;
			
			
			//обновляем количество 
			pic_changes -= loader.update_price;
			objects.pic_changes_text.text=pic_changes;
		});
		
		//если какая-то ошибка произошла
		loader.onError.add(() => {
			big_message.show('Ошибка','Не получилось загрузить картинку','Побробуйте снова', function(){menu2.set_random_pic(loader.update_price)},null);
			console.log("Error resources");
			
			//обновляем количество 
			pic_changes += loader.update_price;
			objects.pic_changes_text.text=pic_changes;
			
		});
		
		
		
						
	},
		
	change_pic_down: function() {	
	
		if (objects.buttons_cont2.ready===false || objects.puzzle_pic_updating.visible===true || any_dialog_active===1)
			return;

		if (pic_changes<=0) {			
			big_message.show('Инфа', 'Больше нет купонов на смену картинок', 'Но можно приобрести за рекламу');
			return;
		}
		
		this.set_random_pic(1);		
	},
	
	start_down: function() {
		
		if (objects.buttons_cont2.ready===false || objects.puzzle_pic_updating.visible===true || any_dialog_active===1)
			return;
		
		this.close();
		game.activate();
		
	},
	
	change_board_down : function(size) {
		
		//если нажали на туже сетку то выходим
		if (size===puzzle.size)
			return;

		//снчала скрываем старую сеть
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: false,func: 'linear',val: [1,0],	speed: 0.03	});

		//устанавливаем и пересчитываем параметры паззла
		puzzle.set_size(size);	

		//появление новой сетки
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});

		//обновляем размер и положение картинки		
		anim2.add(objects.puzzle_img,{
			x:[objects.puzzle_img.x,puzzle.x],
			y:[objects.puzzle_img.y,puzzle.y],
			width:[objects.puzzle_img.width,puzzle.width],
			height:[objects.puzzle_img.height,puzzle.width],
		}, true, 0.03);
		
		
		//устанавливаем фрейм
		objects.selection_frame.x=objects['f'+puzzle.size+'_button'].x;
		
		//вычисляем максимальную награду
		let max_rew=p_data_x[puzzle.size-3].sec_reward+p_data_x[puzzle.size-3].swap_reward;
		
		objects.puzzle_info.text=`Подсказок: ${puzzle.hints_amount}\nМаксимальная награда: ${max_rew}`;
		


	},
	
	back_button_down : function() {
		
		if (objects.puzzle_pic_updating.visible===true || objects.puzzle_img.ready===false || objects.puzzle_pic_updating.visible===true || any_dialog_active===1)
			return;
		
		
		this.close();
		main_menu.activate();
		
	},
	
	close : function() {
		

		
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
	swaps_made:0,
    process: function () {},

    activate: function () {
		
		//просто показываем все ячейки в правильном порядке
		puzzle.init();
				
		//перемешиваем паззлы		
		puzzle.shuffle();
		
		//добавляем сетку картинки
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
			
		//добавляем кнопки
		anim.add_pos({obj: objects.game_buttons_cont,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		
		//добавляем прогресс 
		anim.add_pos({obj: objects.rewards_bcg,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		anim.add_pos({obj: objects.reward_time_slider,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		anim.add_pos({obj: objects.reward_swap_slider,param: 		'x',vis_on_end: true,func: 'linear',val: [450,'sx'],	speed: 0.03	});
		
		
		//показываем сколько подсказок есть
		objects.hint_button_text.text="(x "+puzzle.hints_amount+")"

		this.swaps_made=0;
		
		//устанавливаем начальные значения ревордов
		objects.reward_time_text.text = p_data_x[puzzle.size - 3].sec_reward;
		objects.reward_swap_text.text = p_data_x[puzzle.size - 3].swap_reward;
				
		//фиксируем начало игры
		this.start_time=game_tick;		
		
		//утсанавливаем процессинговую функцию
		g_process=function(){game.process()};
	},
	
	puzzle_complete: function() {
		
		//показываем сообщение
		puzzle_complete_message.show();
		
		//вычисляем и отображаем награду за время
		objects.game_complete_time_rew.text='Награда за скорость: ' + this.get_sec_reward_data()[0];
		
		//вычисляем и отображаем награду за свопы
		objects.game_complete_swap_rew.text='Награда за точность: ' + this.get_swap_reward_data()[0];
								
		//Скрываем сетку
		anim.add_pos({obj: objects['net_'+puzzle.size],param: 'alpha',	vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});

		//утсанавливаем процессинговую функцию которая вращает фигуру
		g_process=function(){puzzle_complete_message.process()};
		
	},
	
	back_button_down: function() {
		
		if (any_dialog_active===1)
			return;
		
		puzzle.start_back_shuffle();
		big_message.show('Инфа', 'Игра не завершена', 'Но можно начать снова');
		this.close();
		menu2.activate(0);
	},
	
	finish_game : function () {
		
		puzzle.hide();
		this.close();
		menu2.activate(1);
		
	},
	
	hint_button_down: function () {		
	
		if (any_dialog_active===1)
			return;
	
		if (puzzle.show_hint()===true)
			objects.hint_button_text.text="(x "+puzzle.hints_amount+")"
	},
	
	process : function () {
		

		let rew_data = this.get_sec_reward_data();
		
		objects.reward_time_slider.x = - 10 + 390 * rew_data[1];			

		objects.reward_time_text.text = rew_data[0];
		
		
		
	},
	
	get_swap_reward_data : function () {
		
		let max_swaps = p_data_x[puzzle.size - 3].swaps;		
				
		let perc = 1 - this.swaps_made / max_swaps;
		let cur_reward = Math.round(p_data_x[puzzle.size - 3].swap_reward * perc);		
		
		if (perc<0) {
			perc = 0;
			cur_reward = 0;			
		}
		
		return [cur_reward, perc];
	},
	
	get_sec_reward_data : function () {
		
		//контролируем уменишение времени и соотетственно возможной награды
		let sec_left = game_tick - this.start_time;
		let max_sec = p_data_x[puzzle.size - 3].sec;
	
		let perc = 1 - sec_left / max_sec;
		let cur_reward = Math.round(p_data_x[puzzle.size - 3].sec_reward * perc);	
		
		if (perc<0) {
			perc = 0;
			cur_reward = 0;			
		} 
					
		return [cur_reward, perc];		
		
	},	
	
	made_a_swap : function () {
		
		this.swaps_made++;		
		
		let rew_data = this.get_swap_reward_data();
		
		let new_x_pos = - 10 + 390 * rew_data[1];
		
		anim.add_pos({obj: objects.reward_swap_slider,param: 'x',vis_on_end: true,func: 'easeInOutQuad',val: ['x',new_x_pos],	speed: 0.05});

		objects.reward_swap_text.text = rew_data[0];		
		
	},
	
	close: function() {		
		
		//убираем кнопки
		anim.add_pos({obj: objects.game_buttons_cont,param: 		'x',vis_on_end: false,func: 'linear',val: ['sx',-450],	speed: 0.03	});
		
		
		anim.add_pos({obj: objects.rewards_bcg,param: 		'x',vis_on_end: false,func: 'linear',val: ['x',-450],	speed: 0.03	});
		anim.add_pos({obj: objects.reward_time_slider,param: 		'x',vis_on_end: false,func: 'linear',val: ['x',-450],	speed: 0.03	});
		anim.add_pos({obj: objects.reward_swap_slider,param: 		'x',vis_on_end: false,func: 'linear',val: ['x',-450],	speed: 0.03	});
		
		
			
	}
	
}

var puzzle_complete_message= {
	
	show : function() {
		
		anim.add_pos({obj: objects.game_complete_cont,param: 'x',		vis_on_end: true,func: 'easeOutBack',val: [-500,'sx'],	speed: 0.03	});
		anim.add_pos({obj: objects.rainbow,param: 'alpha',		vis_on_end: true,func: 'linear',val: [0,1],	speed: 0.03	});
		objects.rainbow.visible=true;
		any_dialog_active=1;
	},
	
	close : function () {
		any_dialog_active=0;		
		anim.add_pos({obj: objects.game_complete_cont,param: 'x',		vis_on_end: false,func: 'easeInBack',val: ['sx',500],	speed: 0.03	});
		game.finish_game();
		anim.add_pos({obj: objects.rainbow,param: 'alpha',		vis_on_end: false,func: 'linear',val: ['alpha',0],	speed: 0.03	});
	},
	
	process : function () {
		if (objects.rainbow.visible===true)
			objects.rainbow.rotation+=0.03;
		
	}
	
	
	
}

function vis_change() {
	
	if (document.hidden===true) {
		//game.process_finish_game(1,0);
	}	
}

var auth={
		
	// эта функция вызывается один раз в начале игры
	callback_func: (){},
		
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
			
	vkbridge_events: function(e) {

		if (e.detail.type === 'VKWebAppGetUserInfoResult') {
			
			my_data.name 	= e.detail.data.first_name + ' ' + e.detail.data.last_name;
			my_data.uid 	= "vk"+e.detail.data.id;
			my_data.pic_url = e.detail.data.photo_100;			
			
			console.log(`Получены данные игрока от VB MINIAPP:\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);
			auth.process_results();			
		}	
	},
			
	init: function(callback) {
		
		//это функция которая будет вызвана после загрузки данных игрока
		this.callback_func=callback;
		
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
	
		
		let s = window.location.href;

		//-----------ЯНДЕКС------------------------------------
		if (s.includes("yandex")) {						
			Promise.all([
				this.loadScript('https://yandex.ru/games/sdk/v2')
			]).then(function(){
				auth.yandex();	
			});
			return;
		}
		
		
		
		//-----------ВКОНТАКТЕ------------------------------------
		if (s.includes("vk.com")) {			
			Promise.all([
				this.loadScript('https://vk.com/js/api/xd_connection.js?2'),
				this.loadScript('//ad.mail.ru/static/admanhtml/rbadman-html5.min.js'),
				this.loadScript('//vk.com/js/api/adman_init.js'),
				this.loadScript('https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js')	
				
			]).then(function(){
				auth.vk()
			});
			return;
		}	
		

		//-----------ЛОКАЛЬНЫЙ СЕРВЕР--------------------------------
		if (s.includes("192.168")) {			
			auth.debug();	
			return;
		}
		
		
		//-----------НЕИЗВЕСТНОЕ ОКРУЖЕНИЕ---------------------------
		auth.unknown();
		
	},
	
	yandex: function() {
	
		game_platform="YANDEX";
		if(typeof(YaGames)==='undefined')
		{		
			auth.process_results();	
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
				
				console.log(`Получены данные игрока от яндекса:\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);
				
				//если личные данные не получены то берем первые несколько букв айди
				if (my_data.name=="" || my_data.name=='')
					my_data.name=my_data.uid.substring(0,5);
				
				auth.process_results();		
				
			}).catch((err)=>{
				
				//загружаем из локального хранилища
				auth.local();	
				
			})
		}	
	},
			
	vk: function() {
		
		game_platform="VK";		
		vkBridge.subscribe((e) => this.vkbridge_events(e)); 
		vkBridge.send('VKWebAppInit');	
		vkBridge.send('VKWebAppGetUserInfo');
		
	},	

	debug: function() {	
	
		game_platform = "debug";
		let uid = prompt('Отладка. Введите ID', 100);
		
		my_data.name = my_data.uid = "debug" + uid;
		my_data.pic_url = "https://ibb.co/GCW6vg0";	
		
		auth.process_results();

	},
	
	local: function() {
		
		game_platform="LOCAL";
				
		//ищем в локальном хранилище
		let local_uid = localStorage.getItem('uid');
		
		//здесь создаем нового игрока в локальном хранилище
		if (local_uid===undefined || local_uid===null) {
			
			console.log("Создаем нового локального пользователя");
			
			let rnd_names=["Бегемот","Жираф","Зебра","Тигр","Ослик","Мамонт","Волк","Лиса","Мышь","Сова","Слон","Енот","Кролик","Бизон","Пантера"];
			let rnd_num=Math.floor(Math.random()*rnd_names.length)
			let rand_uid=Math.floor(Math.random() * 99999);
			
			my_data.name 		=	rnd_names[rnd_num]+rand_uid;
			my_data.rating 		= 	1400;
			my_data.uid			=	"ls"+rand_uid;	
			my_data.pic_url		=	'https://avatars.dicebear.com/v2/male/'+irnd(10,10000)+'.svg';;	
			
			localStorage.setItem('uid',my_data.uid);		
			auth.process_results();
		}
		else
		{
			console.log(`Нашли айди в ЛХ (${local_uid}). Загружаем остальное из ФБ...`);
			
			my_data.uid = local_uid;	
			my_data.uid = local_uid;	
			
			//запрашиваем мою информацию из бд или заносим в бд новые данные если игрока нет в бд
			firebase.database().ref("players/"+my_data.uid).once('value').then((snapshot) => {		
							
				var data=snapshot.val();
				if (data!==null) {
					my_data.pic_url = data.pic_url;
					my_data.name = data.name;
				}			

			}).catch((error) => {	


			}).finally(()=>{
			
				auth.process_results();
			})	

		}

				
	},
	
	unknown: function () {
		
		game_platform="unknown";
		alert("Неизвестная платформа! Кто Вы?")
		
		//загружаем из локального хранилища
		auth.local();		
	},
	
	process_results: function() {
		
								
		//отображаем итоговые данные
		console.log(`Итоговые данные:\nПлатформа:${game_platform}\nимя:${my_data.name}\nid:${my_data.uid}\npic_url:${my_data.pic_url}`);								
		
		//обновляем данные в файербейс так могло что-то поменяться
		firebase.database().ref("players/"+my_data.uid).set({name:my_data.name, pic_url: my_data.pic_url, tm:firebase.database.ServerValue.TIMESTAMP});
								
		//вызываем коллбэк
		this.callback_func();
	
	}
	
}

var lb={
	
	add_game_to_vk_menu_shown:0,
	cards_pos: [[10,300],[10,355],[10,410],[10,465],[10,520],[10,575],[10,630]],
	
	activate: function() {
		
	
		
		anim.add_pos({obj:objects.lb_1_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});
		anim.add_pos({obj:objects.lb_2_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});
		anim.add_pos({obj:objects.lb_3_cont,param:'x',vis_on_end:true,func:'linear',val:[450,'sx'],	speed:0.03});
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
				
				
		objects.lb_back_button.visible=false;
		
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
		
		
		//game_res.resources.click.sound.play();		
		this.close();
		main_menu.activate();
		
	},
	
	update: function () {
		
		firebase.database().ref("players").orderByChild('rating').limitToLast(25).once('value').then((snapshot) => {
			
			if (snapshot.val()===null) {
			  console.log("Что-то не получилось получить данные о рейтингах");
			}
			else {				
				
				var players_array = [];
				snapshot.forEach(players_data=> {			
					if (players_data.val().name!=="" && players_data.val().name!=='')
						players_array.push([players_data.val().name, players_data.val().rating, players_data.val().pic_url]);	
				});
				

				players_array.sort(function(a, b) {	return b[1] - a[1];});
				
				
				//загружаем аватар соперника
				var loaderOptions = {loadType: PIXI.loaders.Resource.LOAD_TYPE.IMAGE};
				var loader = new PIXI.Loader();
								
				var len=Math.min(10,players_array.length);
				
				//загружаем тройку лучших
				for (let i=0;i<3;i++) {
					let fname=players_array[i][0];					
					fname = cut_string(fname,objects['lb_1_name'].fontSize,180);
					
					objects['lb_'+(i+1)+'_name'].text=fname;
					objects['lb_'+(i+1)+'_rating'].text=players_array[i][1];					
					loader.add('leaders_avatar_'+i, players_array[i][2],loaderOptions);
				};
				
				//загружаем остальных
				for (let i=3;i<10;i++) {
					let fname=players_array[i][0];	
					objects.lb_cards[i-3].full_name=fname;
					
					fname = cut_string(fname,objects.lb_cards[i-3].name.fontSize,180);
					
					objects.lb_cards[i-3].name.text=fname;
					objects.lb_cards[i-3].rating.text=players_array[i][1];					
					loader.add('leaders_avatar_'+i, players_array[i][2],loaderOptions);					
					
				};
				
				
				
				loader.load((loader, resources) => {
					for (let i=0;i<3;i++)						
						objects['lb_'+(i+1)+'_avatar'].texture=resources['leaders_avatar_'+i].texture;
					
					for (let i=3;i<10;i++)						
						objects.lb_cards[i-3].avatar.texture=resources['leaders_avatar_'+i].texture;

				});
			}

		});
		
	}
	
}

function init_game_env() {
			

			
	document.getElementById("m_bar").outerHTML = "";
    document.getElementById("m_progress").outerHTML = "";

	//короткое обращение к ресурсам
	gres=game_res.resources;

    app = new PIXI.Application({width: M_WIDTH, height: M_HEIGHT, antialias: false, backgroundColor: 0x553399});
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
        const obj_class = load_list[i][0];
        const obj_name = load_list[i][1];

        switch (obj_class) {
        case "sprite":
            objects[obj_name] = new PIXI.Sprite(game_res.resources[obj_name].texture);
            eval(load_list[i][2]);
            break;

        case "block":
            eval(load_list[i][2]);
            break;

        case "cont":
            eval(load_list[i][2]);
            break;

        case "array":
			var a_size=load_list[i][2];
			objects[obj_name]=[];
			for (var n=0;n<a_size;n++)
				eval(load_list[i][3]);
            break;
        }
    }

    //обрабатываем вторую часть кода в объектах
    for (var i = 0; i < load_list.length; i++) {
        const obj_class = load_list[i][0];
        const obj_name = load_list[i][1];

        switch (obj_class) {
        case "sprite":
            eval(load_list[i][3]);
            break;

        case "block":
            eval(load_list[i][3]);
            break;

        case "cont":	
	        eval(load_list[i][3]);
            break;

        case "array":
			var a_size=load_list[i][2];
				for (var n=0;n<a_size;n++)
					eval(load_list[i][4]);	;
            break;
        }
    }

	
	//загружаем данные
    auth.init(function() {		
		main_menu.activate();	
	});
		

	
    //запускаем главный цикл
    main_loop();

}

function load_resources() {


    game_res = new PIXI.Loader();
	
	
	//let git_src="https://akukamil.github.io/duel/"
	let git_src=""
	

	game_res.add("m2_font", git_src+"m_font.fnt");


    //добавляем из листа загрузки
    for (var i = 0; i < load_list.length; i++)
        if (load_list[i][0] == "sprite" || load_list[i][0] == "image")
            game_res.add(load_list[i][1], git_src+"res/" + load_list[i][1] + ".png");
		

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

