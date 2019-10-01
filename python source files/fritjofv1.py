# -*- coding: utf-8 -*-
"""
Created on Thu Sep 19 16:00:58 2019

@author: Thibault Vieu
"""
import warnings
with warnings.catch_warnings():
    warnings.filterwarnings("ignore",category=DeprecationWarning)
    import matplotlib.pyplot as plt

from view import drawwindow
from init import initialize
from moves import playmove,add_move
from util import *
from variations import *
from filegestion import *
from edit import *

plt.ion()
global selection, board, i_reader, variations, x, factor, com, rightselection

#variations is a list containing lists representing each node of the variations tree.
#The first element of variations[i] gives the type of node:
# '{' -> splitting
# '}' -> end of branch
# -1  -> the position has been modified by hand
# (X1,X2,l) -> the pawn previously in X1 has been moved to X2, and l contains the list of captures. 
#The second element of variations[i] gives the arrows and markers (integers are markers and tuples are arrows)
#The third element of variations[i] gives the notes entered by the user,
#    except when the position has been modified by hand (-1): in this case it gives
#    the lists of the pawns added and removed by hand, and the fourth element gives the notes.
        
def updateplot(ax1,ax2,ax3,ax4,ax5):
    global x,listlabels
    size = 10
    if variations[i_reader][0]!=-1:
        arrows=variations[i_reader][1]
    else:
        arrows=variations[i_reader][3]
    ax1.clear()
    ax2.clear()
    ax3.clear()
    ax4.clear()
    ax5.clear()
    ax1.set_axis_off()
    ax2.set_axis_off()
    ax3.set_axis_off()
    ax4.set_axis_off()
    ax5.set_axis_off()
    x,listlabels = drawwindow(f,(ax1,ax2,ax3,ax4,ax5),sizewin,board,variations,nb_to_coord(abs(selection)),arrows,i_reader,x,size,factor,com,warning,showhelp)
    f.canvas.draw()

def onclick(event):
    global com,rightselection,x,edit,warning,showhelp
    global selection, i_reader, variations, board, listlabels
    warning = False
    if not com:
        if event.xdata != None and event.ydata != None:
            if event.xdata >= -0.5 and event.xdata < 10.5 and event.ydata >= -0.5 and event.ydata < 10.5 and event.inaxes.dataLim.x0 == event.inaxes.dataLim.y0 and event.inaxes.dataLim.x1 == event.inaxes.dataLim.y1 and event.inaxes.dataLim.x0<0:
                i,j=int(event.xdata+0.5), int(event.ydata+0.5)
                clickpoint = convert_coord_to_nb((i,j))
                if event.button == 1:
                    if board[i][j]!=0:
                        selection = clickpoint
                    if board[i][j]==0 and selection>=0:
                        if variations[i_reader+1][0]=='}':
                            selection, variations, i_reader = add_move(selection,clickpoint,board,i_reader,variations)
                            board = playmove(board,variations[i_reader][0],1,i_reader,variations)
                        else:
                            lvar = checkexistingvariations(i_reader,variations)
                            test = add_move(selection,clickpoint,board,i_reader,[])[1]
                            testadd = True
                            for i in range(len(lvar)):
                                if test[0][0]==lvar[i][1]:
                                    testadd=False
                                    i_reader = lvar[i][0]
                                    break
                            if testadd:
                                i_reader,variations = add_variation(i_reader,variations)
                                selection, variations, i_reader = add_move(selection,clickpoint,board,i_reader,variations)
                                board = playmove(board,variations[i_reader][0],1,i_reader,variations)
                            else:
                                board = gotovariation(i_reader,variations,board)
                    if board[i][j]==0:
                        selection = -clickpoint
                            
                if event.button == 3:
                    rightselection = clickpoint
                    if (edit==1 or edit==2):
                        if board[i][j]!=0:
                            selection,i_reader,variations,board = removepawn(rightselection,i_reader,variations,board) 
                        else:
                            selection,i_reader,variations,board = addpawn(rightselection,i_reader,variations,2*edit-3,board)
            else:
                selection = -1000
            if event.inaxes.dataLim.x0 == 0.225 and event.inaxes.dataLim.y0 == 0.66 and event.inaxes.dataLim.x1==0.505 and event.inaxes.dataLim.y1==0.96:
                if event.xdata>0.23 and event.xdata<0.5 and event.ydata>0.65 and event.ydata<0.95:
                    showhelp = True
            if event.xdata>0.12 and event.xdata < 0.7 and event.button==1 and event.inaxes.dataLim.x0>10000000:
                yy = event.ydata
                if yy >0.888 and yy < 0.96:
                    savegame(variations)
                if yy >0.81 and yy < 0.888:
                    board,variations=loadgame(board,variations)
                    i_reader = 0
                if yy >0.65 and yy < 0.75:
                    edit = 1
                if yy >0.57 and yy < 0.65:
                    edit = 2
                if yy >0.49 and yy < 0.57:
                    edit = 4
                if yy >0.4 and yy < 0.49 and variations[i_reader-1][0]=='{' and i_reader>1:
                    warning = True
                if yy >0.275 and yy < 0.343 and (variations[i_reader][0] != '{' and variations[i_reader][0] != '}' or i_reader==0):
                    com = True
                    updateplot(ax1,ax2,ax3,ax4,ax5)
                    variations = addnote(variations,i_reader)
            if event.inaxes.dataLim.x0 == -1.5:
                xx = event.xdata
                yy = event.ydata
                for lab in listlabels:
                    if (xx-lab[0])**2<0.05 and (yy-lab[1])**2<0.05:
                        i_reader = lab[3]
                        board = gotovariation(i_reader,variations,board)
                        break
        else:
            selection = -1000
            rightselection = -1000
        x=-100
        if not com:
            updateplot(ax1,ax2,ax3,ax4,ax5)
            
def onreleasedclick(event):
    global i_reader,variations,board,x,com
    global rightselection
    if not com:
        if event.button == 3 and edit == 4:
            if event.xdata != None and event.ydata != None:
                if event.xdata >= -0.5 and event.xdata < 10.5 and event.ydata >= -0.5 and event.ydata < 10.5:
                    i,j=int(event.xdata+0.5), int(event.ydata+0.5)
                    clickpoint = convert_coord_to_nb((i,j))
                    if variations[i_reader][0]==-1: i=3
                    else: i=1
                    wasin = False
                    for j in range(len(variations[i_reader][i])):
                        if type(variations[i_reader][i][j]) == int:
                            if variations[i_reader][i][j] == clickpoint:
                                del variations[i_reader][i][j]
                                wasin = True
                                break
                        if type(variations[i_reader][i][j]) == tuple:
                            if variations[i_reader][i][j][0] == clickpoint:
                                del variations[i_reader][i][j]
                                wasin = True
                                break
                    if not wasin:
                        if clickpoint == rightselection:
                            variations[i_reader][i].append(rightselection)
                        else:
                            variations[i_reader][i].append((rightselection,clickpoint))
        rightselection,x = -1000,-100
        updateplot(ax1,ax2,ax3,ax4,ax5)

def on_key(event):
    global x,factor,com,warning,showhelp
    global i_reader, board, selection, variations   
    if not com:
        if event.key=='o' and not com:
            board,variations=loadgame(board,variations)
            i_reader = 0
        if event.key=='s' and not com:
            savegame(variations)       
        if event.key=="left" and i_reader>0:
            i_reader,board = goleft(i_reader,variations,board)
        if event.key=="right" and variations[i_reader+1][0]!='}':
            i_reader,board = goright(i_reader,variations,board)       
        if event.key=="down":
            i_reader,board = godown(i_reader,variations,board) 
        if event.key=='+' and factor > 0.1 and not com:
            factor-=0.1   
        if event.key=='-' and not com:
            factor+=0.1   
        if event.key=='enter' and warning:
            i_reader,variations = del_variation(i_reader,variations)
            board = gotovariation(i_reader,variations,board)    
        x,warning,showhelp = -100, False,False
        updateplot(ax1,ax2,ax3,ax4,ax5)
    
def onscroll(event):
    global x
    if event.button == 'up':
        x-=1
    if event.button =='down':
        x+=1
    updateplot(ax1,ax2,ax3,ax4,ax5)
    
def resize(event):
    global ax1,ax2,ax3,ax4,ax5
    global wh0,sizewin
    w,h = event.width, event.height
    wh = min(w,h)
    if wh<w and 1.-wh/w-0.1*wh/w>=0:
        f.clf()
        ax1 = f.add_axes([0., 0., wh/w, wh/h ])
        ax2 = f.add_axes([wh/w+0.05*wh/w, 0., 1.-wh/w, 1-0.4*wh/h ])
        ax3 = f.add_axes([wh/w+0.1*wh/w, 1-0.45*wh/h,1.-wh/w-0.1*wh/w, 0.4*wh/h ])
        ax4 = f.add_axes([wh/w-0.05*wh/w, 1-0.8*wh/h,0.1*wh/w, 0.8*wh/h-0.025*wh/h])
        ax5 = f.add_axes([0.,1-0.1*wh/h,0.2*wh/w,0.1*wh/h ])
        bbox = ax1.get_window_extent().transformed(f.dpi_scale_trans.inverted())
        sizewin = bbox.width/wh0
        updateplot(ax1,ax2,ax3,ax4,ax5)

if __name__ == '__main__':
    f=plt.figure("Fritjof v1 - Hnefatafl game review",figsize=(15,8))
    try:
#        figManager = plt.get_current_fig_manager()
#        figManager.window.setWindowIcon(QtGui.QIcon('D:\\T2\\HN\\fritjof_v1\\icon.ico'))
        thismanager = plt.get_current_fig_manager()
        thismanager.window.wm_iconbitmap("icon.ico")
    except:
        pass
    
    whw,whh = 0.53,1.
    ax1 = f.add_axes([0., 0., whw, whh ])
    ax2 = f.add_axes([whw+0.05*whw, 0., 1.-whw, 1-0.4*whh ])
    ax3 = f.add_axes([whw+0.1*whw, 1-0.45*whh,1.-whw-0.1*whw, 0.4*whh ])
    ax4 = f.add_axes([whw-0.05*whw, 1-0.8*whh,0.1*whw, 0.8*whh-0.025*whh])
    ax5 = f.add_axes([0.,1-0.1*whh,0.2*whw,0.1*whh ])
    x,factor = -1,2
    rightselection, edit = -1000, 1
    selection, board, i_reader, variations = initialize()
    listlabels = []
    bbox = ax1.get_window_extent().transformed(f.dpi_scale_trans.inverted())
    wh0,sizewin = bbox.width,1.
    com,warning,showhelp = False,False,False
    updateplot(ax1,ax2,ax3,ax4,ax5)
    active = True
    while active:            
        if plt.get_fignums():
            if not com:
                f.canvas.mpl_connect('key_press_event', on_key)
                f.canvas.mpl_connect('button_press_event', onclick)
                f.canvas.mpl_connect('button_release_event', onreleasedclick)
                f.canvas.mpl_connect('scroll_event',onscroll)
                f.canvas.mpl_connect('resize_event',resize)
                plt.waitforbuttonpress()
            if com:
                plt.waitforbuttonpress()
                com=False
                file= open("_tempcom.txt","r")
                contents =file.read()
                if variations[i_reader][0]!=-1:
                    variations[i_reader][2]=contents
                else:
                    variations[i_reader][4]=contents
                file.close()
        else:
            active=False