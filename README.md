# p2p-whiteboard

## 紹介

複数人で共有できるホワイトボードのアプリです。
校内コンテストの作品として、1人で作って公開しました。
[Webでも公開しています。](https://portfolio.kokubokazuki.com/p2p-whiteboard/)
## 起動方法

1. セキュリティーキーの書き換え

app.pyのセキュリティーキーを書き換えてください
~~~
app.config['SECRET_KEY'] = 'secret!'
~~~
2. コンテナを起動する

このコマンドで起動できます。
~~~
docker compose up
~~~
3. サイトにアクセスする

ポート18080で公開されます。
[localhost:18080](http://localhost:18080/)
