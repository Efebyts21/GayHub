import { setIconCss, setClickTreeCss, setClickBlobCss } from 'utils/setIconStyle'
import Pjax from 'pjax'
/* 根据浏览器的url解析参数 */
const getUrlParam = function() {
    const pathname = window.location.pathname
    const parseParam = pathname.replace(/^\//, '').split('/')

    const oParam = {
        userName: '',
        reposName: '',
        type: '',
        branch: ''
    }
    oParam.userName = parseParam[0]
    oParam.reposName = parseParam[1]
    oParam.type = parseParam[2] ? `${parseParam[2]}` : 'tree'
    oParam.branch = parseParam[3] ? `${parseParam[3]}` : 'master'

    return oParam
}

/* 获取当前的文件名称 */
const getCurrentPath = function() {
    const pathname = window.location.pathname,
        parseParam = pathname.replace(/^\//, '').split('/')
    let currentPath = ''

    if (parseParam[2]) {
        currentPath = parseParam.slice(4)
        currentPath = currentPath.length === 1 ? currentPath[0] : currentPath.join('/')
    }
    return currentPath
}


/**
 * 高效找出当前文件夹所有符合条件的文件
 * @param {type:Object} fileTree 
 * @param {type:Array} allFiles 
 * @param {type:Number} cascad 
 */
const getCurrentTreeFiles = function(fileTree, allFiles, cascad) {

    let arr = []
    let flag = 0
    for (let i = 0, len = allFiles.length; i < len; i++) {

        let current = allFiles[i].path.split('/').length

        if (new RegExp(`^${fileTree.path}`).test(allFiles[i].path) && (cascad + 1 === current)) {

            arr.push(allFiles[i])
            flag++

        } else {

            //  匹配成功第一次后面再也没匹配成功过，直接跳出循环
            if ((flag !== 0) && !new RegExp(`^${fileTree.path}`).test(allFiles[i].path)) {
                break
            }
        }

    }
    return arr

}


const oParam = getUrlParam()
const currentPath = getCurrentPath()

/* 解析首次打开url要解析的DOM结构 */
const initDOM = function(files, parent) {
    /* 找到当前url对应的A标签 */

    console.log(currentPath)

    generateCurrentTreeDOM(files, parent, 2, files)

}

/* 点击之后重新生成渲染DOM */
const RenderDOM = function(eleLi, ele, files) {

    let currentCascad = ele.path.split('/').length

    /* 当前目录下的所有文件 */
    let currentTreeFiles = getCurrentTreeFiles(ele, files, currentCascad)

    let currenteleLiChild = eleLi.querySelectorAll('li')

    /* 求出当前目录下所有的文件夹DOM节点，也就是type=tree */
    let treeChild = []

    currenteleLiChild.forEach(ele => {
        if (ele.getAttribute('type') === 'tree') {
            treeChild.push(ele)
        }
    })

    /* 求出当前所有文件树的状态信息，也就是type=tree */
    let treeMsg = []

    currentTreeFiles.forEach(ele => {
        if (ele.type === 'tree') {
            treeMsg.push(ele)
        }
    })

    /* 如果当前目录下的所有文件并没有文件夹类型 */
    if (treeChild.length && (eleLi.getAttribute('generateDOM') !== 'off')) {

        treeChild.forEach((ele, index) => {
            let nextCascad = treeMsg[index].path.split('/').length
            let nextTreeFiles = getCurrentTreeFiles(treeMsg[index], files, nextCascad)

            /* 如果不是空文件夹 */
            if (nextTreeFiles.length) {
                generateCurrentTreeDOM(nextTreeFiles, ele, nextCascad + 1, files)
            }

        })

        /* 重新渲染Pjax */
        new Pjax({
            elements: "a",
            selectors: ['#js-repo-pjax-container', '.context-loader-container', '[data-pjax-container]']
        })
    }

    /* 设置开关，防止重复渲染，影响性能 */
    eleLi.setAttribute('generateDOM', 'off')
}




/**
 * 递归生成当前文件树下面所有的DOM结构 
 * @param {*当前目录所有的文件} CurrentTreeFiles 
 * @param {*DOM的根节点} parent 
 * @param {*当前层级，点击一下递归再生成两层目录} cascad 
 * @param {*github接口返回的所有文件树} files 
 */

const generateCurrentTreeDOM = function(CurrentTreeFiles, parent, cascad, files) {

    if (!CurrentTreeFiles.length) {
        throw Error('没有相应的文件')
        return
    }

    let count = CurrentTreeFiles[0].path.split('/').length

    CurrentTreeFiles.forEach(ele => {
        let cascading = ele.path.split('/').length

        if (count === cascading) {
            let outerLi = document.createElement('li')
            let iconI = document.createElement('i')
            let hrefA = document.createElement('a')

            /* 设置相对应的图标 */
            setIconCss(ele, iconI)
            hrefA.textContent = ele.path.split('/').pop()
            outerLi.setAttribute('type', ele.type)

            outerLi.appendChild(iconI)
            outerLi.appendChild(hrefA)

            if (ele.type === 'tree') {
                outerLi.setAttribute('path', ele.path)
            }

            const url = `${oParam.userName}/${oParam.reposName}/${ele.type}/${oParam.branch}`

            hrefA.setAttribute('data-href',
                `${window.location.protocol}//${window.location.host}/${url}/${ele.path}`)

            if (ele.type === 'blob') {
                hrefA.href = `/${url}/${ele.path}`
                hrefA.setAttribute('type', 'blob')
                setClickBlobCss(hrefA)

                if (ele.path.toLocaleLowerCase() === currentPath.toLocaleLowerCase()) {

                    hrefA.setAttribute('isClicked', true)
                    let flag = true // parent => ul

                    if (parent.className !== 'side-bar-main') {
                        parent.parentNode.setAttribute('onoff', 'on')
                        let ele = parent.parentNode //ele => li

                        while (flag) {

                            if (ele.parentNode.className !== 'side-bar-main') {
                                ele.parentNode.parentNode.setAttribute('onoff', 'on')
                            } else {
                                flag = false
                            }
                            ele = ele.parentNode
                        }
                    }

                }

                parent.appendChild(outerLi)

            } else {
                const firstBlobChild = function() {
                    const childrenArr = Array.from(parent.children)
                    for (let eleLi of childrenArr) {

                        if (eleLi.getAttribute('type') === 'blob') {
                            return eleLi
                        }

                    }
                    return null
                }()
                parent.insertBefore(outerLi, firstBlobChild)
            }

            /* 求出tree文件下所有的文件 */
            if (ele.type == 'tree') {

                let oSpan = document.createElement('span')
                outerLi.insertBefore(oSpan, iconI)

                /* 默认文件夹都是收缩的 */

                if (ele.path === currentPath) {

                    outerLi.setAttribute('onoff', 'on')
                    hrefA.setAttribute('isClicked', true)
                    let ele = parent // ele => ul
                    let flag = true

                    while (flag) {
                        if (ele.className !== 'side-bar-main') {
                            ele.parentNode.setAttribute('onoff', 'on')
                        } else {
                            flag = false
                        }
                        ele = ele.parentNode.parentNode
                    }

                } else {
                    outerLi.setAttribute('onoff', 'off')
                }

                setClickTreeCss(outerLi, ele, iconI, files)

                let oUl = document.createElement('ul')
                outerLi.appendChild(oUl)

                /* 高效找出当前文件夹所有符合条件的文件 */
                const currentTreeFiles = getCurrentTreeFiles(ele, files, count)

                if (cascad === count) {
                    return
                }
                arguments.callee(currentTreeFiles, oUl, cascad, files)
            }
        }
    })
}


export { initDOM, getCurrentTreeFiles, generateCurrentTreeDOM, RenderDOM, getUrlParam, getCurrentPath }