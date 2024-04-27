#include "DHT.h" // подключаем библиотеку
 
#define DHTPIN 8  // задаем контакт подключенный к сигнальному контакту датчика (S)
#define photo_street A0
#define led_street 4
#define led_street2 7   
#define DHTTYPE DHT11   // DHT 11 
// обьявляем обьект dht с параметрами
DHT dht(DHTPIN, DHTTYPE);
 
void setup() {
  pinMode(led_street, OUTPUT);
  pinMode(led_street2, OUTPUT);
  pinMode(9, OUTPUT);
  Serial.begin(9600);
  dht.begin(); // запускаем датчик
  digitalWrite(led_street,LOW);
  digitalWrite(led_street2,LOW);
}
 
void loop() {
  //освещение улицы
  int lightness = analogRead(photo_street);
  int brightness = lightness / 4;
  analogWrite(led_street, brightness);
  analogWrite(led_street2, brightness);

  //температура и мотор
  //analogWrite(8, 220);
  delay(500);
  float h = dht.readHumidity(); // считываем влажность
  float t = dht.readTemperature(); // считываем температуру в градусах Цельсия
  // проверяем полученные значения
  if (isnan(h) || isnan(t)) {
    Serial.println("Ошибка чтения датчика");
    return;
  }
  if (t > 15.00) {
      analogWrite(9, 200); 
  }
  else {
      analogWrite(9, 0);
  }
  // выводим полученные данные в консоль  
  Serial.print("Влажность : ");
  Serial.println(h); 
  Serial.print("Температура : ");
  Serial.print(t);
  Serial.println(" *C ");
  Serial.println("---------------------");
}
