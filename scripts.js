// Options for running the program
var options = {
	"delay" : 100, // updateTimer timer every ## milliseconds milliseconds
	"boostPeriod" : 10000, // boost every ## milliseconds
	"maxCatnip" : 10, // How many tons of catnip do we have
	"fixRate" : 2, // How much can a crew-member fix per minute
	"specialistFixRate" : 3,
	"systemMaxDamage" : 1000000, // What is the maximum damage a system can take?
	"collateralDamageThreshold" : 4, // amount of damage needed to damage the supprorted system
	"catnipDamageThreshold" : 8 // amount of damage needed to damage catnip stores
};

var dash = '-'; // Need to get symbol equal width to '+'

var systems = {
	"computer" : {
		"damage" : 0,
		"fixedDamage" : 0,
		"humanName" : "computer",
		"specialist" : "hacker",
		"supports" : "reactor"
	},

	"reactor" : {
		"damage" : 0,
		"fixedDamage" : 0,
		"humanName" : "reactor",
		"specialist" : "scientist",
		"supports" : "engine"
	},

	"engine" : {
		"damage" : 0,
		"fixedDamage" : 0,
		"humanName" : "engine",
		"specialist" : "engineer",
		"supports" : "space-rats"
	},

	"space-rats" : {
		"damage" : 0,
		"fixedDamage" : 0,
		"humanName" : "rat evasion",
		"specialist" : "pilot",
		"supports" : "power-cables"
	},

	"power-cables" : {
		"damage" : 0,
		"humanName" : "power cables",
		"specialist" : "mouser",
		"fixedDamage" : 0,
		"supports" : "computer"
	}
};

function getSystem(system_id) {
	switch(system_id){
		case 1:
		case 2:
			return "computer";
		case 3:
		case 4:
			return "reactor";
		case 5:
		case 6:
			return "engine";
		case 7:
		case 8:
			return "space-rats";
		case 9:
		case 0:
			return "power-cables";
		default:
		console.log('Could not determine system from system_id ' + system_id);
	}
}

function getSystemHumanName(system_id) {
	key = getSystem(system_id);
	return systems[key].humanName;
}

function setup(){
	// Our unset timer object
	interval = null;
	splits = [];

	remainingCatnip = options.maxCatnip;

	$('#add-crew-button').click(function(){
		div = $(`<div class="crew-member"></div>`);
		input = $(`<input type="text" placeholder="Crew Member Name" size=10 />`);
		select = $(`
		       <select class="profession-select">
		       	  <option value="napper">Nap-taker</option>
		          <option value="hacker">Hacker</option>
		          <option value="scientist">Scientist</option>
		          <option value="engineer">Engineer</option>
		          <option value="pilot">Pilot</option>
		          <option value="mouser">Mouser</option>
		        </select>`);
		div.append(input);
		div.append(select);
		$('#crew').append(div);
		input.focus(); 
	});

	$('#boost-button').show();
	$('#boost-button').click(boost);
	$('#ainst').click(function(){
		console.log('Hey');
		$('#instructions').toggle();
	});

}


function updateDashboard(){
	// Show how much catnip is left

	var catnipString =
		Array(Math.max(options.maxCatnip - remainingCatnip, 0) + 1).join("+") + 
		Array(Math.min(remainingCatnip, options.maxCatnip)+ 1).join(dash);

	for (var system in systems){
		selector = '#' + system + ' >  .div-table-col2';
		var damageString =
			Array(systems[system].fixedDamage + 1).join("+") + 
			Array(systems[system].damage + 1).join(dash);
		$(selector).html(damageString);
	}


	// Update the UI
	$('#catnip').html(catnipString);
}

// Execute this every options.delay milliseconds
function updateTimer(){
	now = Date.now();

	// Round the milliseconds to the nearest 10th of a second
	secondsSinceStart = ((now - startTime)/1000).toFixed(1);

	// Using secondsSinceStart, get next boost using modulo operator
	timeToNextBoost = options.boostPeriod - (now - offset);

	// Fix any precision errors:
	timeToNextBoost = (timeToNextBoost/1000).toFixed(1);

	// Update the ui

	$('#flight-time > span').html(secondsSinceStart);
	$('#time-to-next-boost > span').html(timeToNextBoost);

}

function startTimer(){
	if (!interval) {
		startTime = offset = Date.now();
		interval = setInterval(updateTimer, options.delay);
	}
}





function delta() {
	var now = Date.now(),
		d = now - offset;
	offset = now;
	return d;
}

function getFixedDamage(crewMember, occupation, location){

	if (systems[location].specialist == occupation){
		return(Math.min(options.specialistFixRate, systems[location].damage ));
	} else {
		return(Math.min(options.fixRate, systems[location].damage));
	}

}

function boost() {
	splitTime = delta();
	splits.push(splitTime.toFixed(2));

	system_id = Math.round(splitTime/10) % 10;
	damage_amount = Math.abs(Math.round((options.boostPeriod - splitTime)/100));
	system_name = getSystem(system_id);
	system_human_name = getSystemHumanName(system_id);

	boostMessage = 
		"Boost fired after " + 
		(splitTime/1000).toFixed(2) +
		" seconds. Damage report: " +
		damageSystem(system_name, damage_amount);

	boostMessage += checkCollateralDamage();

	$('#boost-history-list').prepend($('<li>').append(boostMessage));

	systems[system_name].damage += damage_amount;

	// Handle those who are at places
	$('select.green').each(function(){
		var location = $(this).val();
		var occupation = $(this).siblings('select').val();
		var crewMember = $(this).siblings('input').val();
		var damageFixed = getFixedDamage(crewMember, occupation, location);
		if (damageFixed) {
			$('#boost-history-list').prepend('<li>' + crewMember + " (" + occupation + ") fixed " + damageFixed + " damage at " + location);
		}
		
		systems[location].fixedDamage += damageFixed;
		systems[location].damage -= damageFixed;
	});

	// Handle those who are going places
	$('select.yellow').each(function(){
		$(this).removeClass('yellow');
		$(this).addClass('green');
	});

	// Handle those who are leaving places
	$('select.white').each(function(){
		$(this).removeClass('white');
		$(this).addClass('yellow');
	});

	var damagedSystem = isSystemCriticallyDamaged();

	updateDashboard();
	if (remainingCatnip <= 0){
		
		gameOver('All of your catnip has been ruined');
		
	} else if (damagedSystem) {
		gameOver("Ship destroyed due to critically damaged " + systems[damagedSystem].humanName);
	}
}

function isSystemCriticallyDamaged(){
	for (var systemKey in systems){
		if (systems[systemKey].damage + systems[systemKey].fixedDamage >= options.systemMaxDamage){
			return systemKey;
		}
	}
	// If nothing is above the max damage threshhold, return false
	return false;
}

function gameOver(message){
	stop();
	$('#boost-history-list').prepend($('<li>').append(message));
}

function checkCollateralDamage() {
	collateralDamageString = "";

	// Define a stack for executing damage once we are done
	var damageStack = [];
	for (var systemKey in systems){
		if (systems[systemKey].damage >= options.collateralDamageThreshold) {
			collateralDamage = Math.floor(systems[systemKey].damage / options.collateralDamageThreshold);
			damageStack.push({"key" : systems[systemKey].supports, "damage": collateralDamage});
		}

		if (systems[systemKey].damage >= options.catnipDamageThreshold) {
			remainingCatnip--;
			console.log("<br> - Lost one ton of catnip due to malfunctions in " + systems[systemKey].humanName);
			collateralDamageString += "<br> - Lost one ton of catnip due to malfunctions in " + systems[systemKey].humanName;
		}
	}
	for (var index in damageStack){
		system = damageStack[index];
		systems[system.key].damage += system.damage;
		collateralDamageString += "<br> - " + system.damage + " collateral damage to " + systems[system.key].humanName;
	}
	return collateralDamageString;
}

function damageSystem(system_key, damage_amount){
	damageString = "<br> - " + 
		damage_amount + " damage to " +
		system_human_name + " system!";
	return damageString;
}

function stop() {
	clearInterval(interval);
}

function start() {
	$('#start-button').hide();
	$('#boost-button').prop('disabled',false);
	$('#boost-button').show();
	$('#add-crew-button').hide();
	$('.profession-select').prop('disabled', true);
	$('input').prop('readonly', true);
	$('.crew-member').append(`
		<select>
			<option value="crew_lounge">Crew Lounge</option>
			<option value="computer">Computer</option>
			<option value="reactor">Reactor</option>
			<option value="engine">Engine</option>
			<option value="space-rats">Space Rats</option>
			<option value="power-cables">Power Cables</option>
		</select>
		`);

	$('select').change(function(){
		$(this).removeClass();
		$(this).addClass('yellow');
	});

	startTimer();
}

$(document).ready(function(){
	// Hide the javascript warning, because javascript is working.
	$('#javascript-warning').hide();

	setup();
	updateDashboard();

	$('#start-button').click(start);
});