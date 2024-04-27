// расширитель портов
I2C1.setup({sda: SDA, scl: SCL, bitrate: 100000});
var ext = require('@amperka/gpio-expander').connect({i2c: I2C1, address: 42});
ext.pinMode(0, 'output'); // Свет 1 этаж. 0-зелёный, земля-синий
ext.pinMode(1, 'output'); // Свет 2 этаж. 1-серый-фиолетовый, земля-оранжевый-красный-серый
ext.pinMode(2, 'output'); // Дверь.
ext.pinMode(3, 'output'); // Шлакбаум.
ext.pwmFreq(50);
ext.digitalWrite(1, 0);

var random = require('@amperka/hw-random');
var gasSensor = require('@amperka/gas-sensor').connect({
  dataPin: A2, // разъём SVG
  heatPin: P12, // разъём GHE
  model: 'MQ2',
  r0: 2800
});
//var ledFloor1 = require('@amperka/led').connect(P2).turnOff();//2-зелёный, земля-синий
var ledAlarm = require('@amperka/led').connect(P4).turnOff(); //4-синий, земля-фиолетовый
var gerkon = require('@amperka/button').connect(P5);
var ledGreenBarrier = require('@amperka/led').connect(P6);
var ledRedBarrier = require('@amperka/led').connect(P7);
var buzzer = require('@amperka/buzzer').connect(P8); //8-зелёный
//var ledFloor2 = require('@amperka/led').connect(P8).turnOff(); //8-серый-фиолетовый, земля-оранжевый-красный-серый
var ir = require('@amperka/ir-receiver').connect(P9);
var sonic = require('@amperka/ultrasonic').connect({trigPin: P10, echoPin: P11});
//VCC-красный, GND-коричневый, 10-оранжевый провод, 11-жёлтый
//var door = require('@amperka/servo').connect(P12);
//var barrier = require('@amperka/servo').connect(P13);
var barrierSensor = require('@amperka/analog-line-sensor').connect(A5); //VCC-серый, GND-черный, А5-белый
var hysteresis = require('@amperka/hysteresis').create({high: 0.05, highLag: 4, low: 0.05, lowLag: 0});

var OnOffCode = 0xFF906F;
var OnOffCode2 = 0x3FE41BF;
var OnOffDoor = 0xFF22DD;
var OnOffDoor2 = 0x3FC8B77;
var OnOffBarrier = 0xFFA25D;
var OnOffBarrier2 = 0x3FE8977;
var On2floor = 0xFFE01F;
var Off2floor = 0xFFA857;
var On2floor2 = 0x3FF807F;
var Off2floor2 = 0x3FEA15F;
var PauseWater = 0xFFC23D;
var PauseWater2 = 0x3FF08F7;
var PauseGas = 0xFF02FD;
var isBarrier = false;
var flosed = false;
var isAlarm = false;
var isWater = false;
var canWater = true;
var isGas = false;
var canGas = true;

function openDoor() {
    if (isAlarm == true) return;
    flosed = !flosed;
    if (flosed === true) {
        ext.servoWrite(2, 120);
        ext.digitalWrite(0, 0);
        //door.write(110);
    }
    else {
        ext.servoWrite(2, 45);
        ext.digitalWrite(0, 1);
        //door.write(45);
    }
    //print(flosed);
}

//Светодиод сигнализации и свет на втором этаже
ir.on('receive', function(code, repeat) {
    if (code === OnOffCode || code == OnOffCode2) {
        if (repeat) return;
        isAlarm = !isAlarm;
        ledAlarm.toggle();
    } else if (code == OnOffDoor || code == OnOffDoor2) {
        if(repeat) return;
        openDoor();
    } else if (code == OnOffBarrier || code == OnOffBarrier2) {
        if (repeat) return;
        isBarrier = !isBarrier;
        if (isBarrier == false) {
            ext.servoWrite(3, 100);
            return;
        }
        ledGreenBarrier.turnOn();
        ledRedBarrier.turnOff();
        ext.servoWrite(3, 30);
        setTimeout(function() {
            ext.servoWrite(3, 100);
            isBarrier = false;
        }, 2000);
    } else if (code === On2floor || code === On2floor2) {
        ext.digitalWrite(1, 1);
        //ledFloor2.turnOn();
    } else if (code === Off2floor || code === Off2floor2) {
        ext.digitalWrite(1, 0);
        //ledFloor2.turnOff();
    } else if (code === PauseWater || code == PauseWater2) {
        isWater = true;
    } else if (code == PauseGas) {
        isGas = true;
    }
    print('0x' + code.toString(16));
});

//Открывание входной двери
gerkon.on('press', openDoor);

//Мигание света в доме
setInterval(function() {
    setTimeout(function() {
        if (isAlarm == false) return;
        ext.digitalWrite(0, 1);
        setTimeout(function() {
            ext.digitalWrite(0, 0);
        }, random.int(1000, 3000));
    }, random.int(0, 4000));
}, 1000);

//Газоанализатор
gasSensor.preheat(function() {
    var basePpm = gasSensor.calibrate();
    //print('Calibrate gas: ', basePpm); //записать в r0 в начале
    setInterval(function() {
        var valueGas = gasSensor.read();
        //print('PPM gas: ', valueGas);
        if (isGas == true) {
            buzzer.turnOff();
            canGas = false;
            isGas = false;
        }
        if (valueGas < 5.7) canGas = true;
        if (canGas == false) return;
        if (valueGas > 5.7) {
            canGas = false;
            isGas = false;
            buzzer.frequency(400);
            buzzer.beep(1, 0.5);
            print("Gas");
        }
    }, 1000);
});

//Влажность
setInterval(function() {
    var valueWater = analogRead(A0) * 100;
    if (isWater == true) {
        buzzer.turnOff();
        canWater = false;
        isWater = false;
    }
    if (valueWater < 15) canWater = true;
    if (canWater == false) return;
    if (valueWater > 15) {
        canWater = false;
        isWater = false;
        buzzer.frequency(350);
        buzzer.beep(1, 0.5);
        print("Water");
    }
    //print('Value water: ', Math.round(valueWater), '%');
}, 1000);

//Открывание шлагбаума
//Не забывать каждый раз калибровать значения сенсора
setInterval(function() {
    if (isBarrier == true) return;
    if (barrierSensor.read() < 0.145) {
        ledGreenBarrier.turnOff();
        ledRedBarrier.turnOn();
        ext.servoWrite(3, 100);
        //barrier.write(85);
    } else if (barrierSensor.read() > 0.81 && barrierSensor.read() < 0.91) {
        ledGreenBarrier.turnOn();
        ledRedBarrier.turnOff();
        ext.servoWrite(3, 30);
        //barrier.write(0);
    } else {
        ledRedBarrier.blink(0.5, 0.5);
        ledGreenBarrier.turnOff();
        ext.servoWrite(3, 100);
        //barrier.write(85);
    }
    //print('Value barrier: ' + barrierSensor.read());
}, 100);

//Сигнализация в доме
setInterval(function() {
    sonic.ping(function(err, val) {
        if (err) return;
        hysteresis.push(val);
    }, 'm');
}, 100);


hysteresis.on('low', function(val) {
    if (isAlarm === false){
        ext.digitalWrite(0, 1);
        setTimeout(function() {
            ext.digitalWrite(0, 0);
        }, 5000);
        //ledFloor1.blink(5, 0);
        //ledFloor1.turnOff();
    }
    else {
        buzzer.frequency(300);
        buzzer.beep(1, 0.5);
        ledAlarm.blink(1, 0.5);
        isAlarm = false;
    }
});

hysteresis.on('high', function(val) {
    ext.digitalWrite(0, 0);
    //ledFloor1.turnOff();
    buzzer.turnOff();
    ledAlarm.turnOff();
});
