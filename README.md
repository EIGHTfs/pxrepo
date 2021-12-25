# [pixivrepositories（pxrepo）](https://www.npmjs.com/package/pxrepo)

## 声明

### \*此项目的源码来自 GitHub 上的开源项目:[Tsuk1ko/pxder](https://github.com/Tsuk1ko/pxder)，为了针对个人体验时的想法进行了修改（因为我没学过nodejs,所以改得贼烂,依葫芦画瓢(复制粘贴)试出来的,专业不对口）

![avatar](http://www.deathggunod.space/img/pxrepo/pxrepo.jpg)


## 准备

首先你需要先[下载](https://nodejs.org/dist/v13.12.0/node-v13.12.0-x64.msi) 安装 [Nodejs](https://nodejs.org/zh-cn/)


### 安装

```bash
npm install
```


## 配置

### 登录

```bash
pxrepo --login
```

注：pxrepo 仅会在计算机上储存 refreshAccessToken，而不会储存您的帐号密码

如果要登出

```bash
pxrepo --logout
```

## 对 pxder 的修改


`pxder -f` `pxder -F`

#### 分别会创建`public.json`或`private.json`，获取完指定的所有关注列表开始下载，若已存在文件便直接开始下载

`pxrepo -f` `pxrepo -F`

#### 创建`download.json`，获取关注时每获取一批（30 个)就写入一次，同时直接在下载目录下创建画师对应文件夹，而且若已存在文件也可以提供附加参数`--aptend`继续获取新的关注列表追加到`download.json`。并且仅获取，完成后不会进行下载

`pxder -U`

#### 读取所有下载的画师进行更新

`pxrepo -U`

#### `download.json`不存在，读取所有下载的画师(通过画师对应的文件夹),写入到`download.json`然后进行更新，`download.json`存在即为下载功能

`pxder --setting`

#### 能够设置超时时间，下载线程默认 5，最大 32

`pxrepo --setting`

#### 不能够设置超时时间，线程上限随手改高了，可以设置到 90，默认为 32，然后图片太多实际会比设置的多一点

### 其他方面

#### 缓存目录和程序目录位于同一个文件夹下，下载会在缓存目录下再创建格式为"(" + id + ")"的文件夹。不再是直接都放在整个缓存目录，运行时不会删掉缓存目录 (`pxrepo -D`可以删除缓存目录里面所有文件)

#### 可以一直下载不会卡住了(但如果获取的时候卡住了，那就是真的卡住了)

#### 增加"黑名单"功能手动`pxrepo -l`添加画师 ID 拉入"黑名单"，每次下载前都会检查欲下载的画师的 ID 是否存在于`blacklist.json`，存在就跳过。默认值`[{"id":11}]`,之所以搞这个是因为有些画师号没了;已经下载了保留了自己要的插图，不想再下载他其他的插图了;或者是下面这种情况，基本也可以"拉黑"了，这种好像是画师不让你下载了？，所谓的"拉黑"只是每次都跳过下载，并不是真的pixiv拉黑
```bash
{
  error: {
    user_message: 'Your access is currently restricted.',
    message: '',
    reason: '',
    user_message_details: {}
  }
}
```


#### 为防止 Rate Limit 出现。(不知道限制是多少，反正应该很少出现这种情况了，除非一边下载一遍刷p站？)会自动暂停 15s

#### 可以`pxrepo -C`手动跳过当前`download.json`的第一个画师，跳过原因可能是画师号没了等到导致下载不了的情况


## 参数说明

### 指定画作 ID 下载画作

#### 插画会被下载至`PID`文件夹中

```bash
'-p, --pid <pid(s)>'
```

### 指定画师 UID 下载该画师未下载的一次不超过 5000 张画作

```bash
'-u, --uid <uid(s)>'
```

### PIXIV API限制一次性获取画师不能超过5000.


```bash
'-U'
```


### \*取消当前第一个画师下载任务，一般用于个别画师出现无法进行下载时进行跳过

```bash
'-C, --shift'
```

### 更新你的公开收藏中的插画作品

#### 插画会被下载至`[bookmark] Public`文件夹中

```bash
'-b, --bookmark'
```

### 更新你的私密收藏中的插画作品

#### 插画会被下载至`[bookmark] Private`文件夹中

```bash
'-B, --bookmark-private'
```

### 更新已下载的画师的画作

#### 可配合`--aptend`对`download.json`进行增量更新，默认为新获取数据覆盖`download.json`

`download.json`即为获取的画师信息列表，是 pxrepo 的下载列表

```bash
'-U, --update'
```

### \*找回历史下载的画师及画作

#### 如果不小心把下载目录的文件删除了，只要保有`history.json`即可下载回来

#### 原理是每次使用`'-U, --update'`更新画作会将所有`history.json`中不存在的画师 ID 信息写入其中

#### 通过保留下载过的画师 ID 进行再次下载

```bash
'    --repair'
```

### \*删除缓存目录下所有文件

```bash
'-D, --delete'
```

### \*将不喜欢的画师拉入黑名单

```bash
'-l, --blacklist <uid(s)>'
```

