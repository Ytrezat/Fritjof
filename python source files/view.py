# -*- coding: utf-8 -*-
"""
Created on Wed Sep 18 17:14:32 2019

@author: Thibault Vieu
"""
from math import sqrt
import warnings
with warnings.catch_warnings():
    warnings.filterwarnings("ignore",category=DeprecationWarning)
    import matplotlib.pyplot as plt
    import matplotlib.patches as pat
    from matplotlib.offsetbox import OffsetImage, AnnotationBbox
    plt.rcParams['toolbar'] = 'None'
    try:
        plt.rcParams['keymap.quit'].remove('q')
    except:
        pass
    try:
        plt.rcParams['keymap.fullscreen'].remove('f')
    except:
        pass
    try:
        plt.rcParams['keymap.save'].remove('s')
    except:
        pass

from util import *
    
def drawboard(board,selection,arrows,ax,sizewin):
    n = len(board)
    ax.add_patch(pat.Rectangle((-0.9,-0.9),11.8,11.8,facecolor='k',edgecolor='none'))
    ax.add_patch(pat.Rectangle((-0.5,-0.5),11,11,facecolor='#fbf9f4',edgecolor='none'))
    ax.add_patch(pat.Rectangle((-0.5,-0.5),1,1,color='grey'))
    ax.add_patch(pat.Rectangle((-0.5,9.5),1,1,color='grey'))
    ax.add_patch(pat.Rectangle((9.5,-0.5),1,1,color='grey'))
    ax.add_patch(pat.Rectangle((9.5,9.5),1,1,color='grey'))
    ax.add_patch(pat.Rectangle((4.5,4.5),1,1,color='grey'))
    for i in range(n):
        ax.plot([-0.5,10.5],[i-1/2,i-1/2],color='k')
        ax.plot([i-1/2,i-1/2],[-0.5,10.5],color='k')
        for j in range(n):
            if(board[i][j]==-1):
                ax.add_patch(pat.Circle((i,j),0.35,color='k'))
            if(board[i][j]==1):
                ax.add_patch(pat.Circle((i,j),0.35,color='k'))
                ax.add_patch(pat.Circle((i,j),0.28,color='#ffeeb5'))
            if(board[i][j]==2):
                im = plt.imread('img/king.png')
                oi = OffsetImage(im, zoom = 0.085*sizewin)
                box = AnnotationBbox(oi, (i,j), frameon=False)
                ax.add_artist(box)
            if(board[i][j]==3):
                ax.plot([i],[j],marker='x',color='r',markersize=25)
                ax.plot([i],[j],marker='o',markerfacecolor='none', markeredgecolor='k',markersize=30,markeredgewidth=3)
            if(board[i][j]==-3):
                ax.plot([i],[j],marker='x',color='r',markersize=25)
                ax.plot([i],[j],marker='o',color='k',markersize=30)
                
    if(convert_coord_to_nb(selection)!=1000):
        ax.plot([selection[0]-0.5,selection[0]+0.5],[selection[1]-0.5,selection[1]-0.5],color='r')
        ax.plot([selection[0]-0.5,selection[0]+0.5],[selection[1]+0.5,selection[1]+0.5],color='r')
        ax.plot([selection[0]-0.5,selection[0]-0.5],[selection[1]-0.5,selection[1]+0.5],color='r')
        ax.plot([selection[0]+0.5,selection[0]+0.5],[selection[1]-0.5,selection[1]+0.5],color='r')
        
    for i in range(len(arrows)):
        if type(arrows[i])==int:
            x,y = nb_to_coord(arrows[i])
            ax.plot(x,y,marker='^',markeredgecolor='r',markersize=15,markeredgewidth=3,fillstyle='none')
        if type(arrows[i])==tuple:
            x1,y1 = nb_to_coord(arrows[i][0])
            x2,y2 = nb_to_coord(arrows[i][1])
            l=0.4
            dx = (x2-x1)*(1-l/sqrt((x2-x1)**2+(y2-y1)**2))
            dy = (y2-y1)*(1-l/sqrt((x2-x1)**2+(y2-y1)**2))
            ax.arrow(x1,y1,dx*1,dy*1,head_width=0.4, head_length=l, fc='r', ec='r', width=0.1, zorder=10)
    alpha = ['a','b','c','d','e','f','g','h','i','j','k']
    shift = 1.3
    for i in range(len(alpha)):
        ax.text(i-0.15,-shift,alpha[i],fontsize=14)
        ax.text(-shift-0.1*(i+1>=10),i-0.15,i+1,fontsize=14)
        
def showhelpbutton(ax):
    ax.add_patch(pat.Rectangle((0.225,0.66),0.28,0.3,facecolor='#e5f6fe',edgecolor='k'))
    ax.text(0.26,0.75,"Help",fontsize=12)
    
def buildtree(variations,i_reader):
    n = len(variations)
    depth = 0
    move = 0
    vertices = [(0,0,0)]
    edges = []
    for i in range(1,n-1):
        element = variations[i]
        if element != '{' and element != '}':
            j = 1
            if (variations[i-j] =='}' or variations[i-j] =='{') and i>1:
                compt = 0
                while (compt > 0 or variations[i-j] =='}' or variations[i-j] =='{') and i-j>0:
                    if variations[i-j]=='}':
                        compt+=1
                    if variations[i-j]=='{' and compt>0:
                        compt-=1
                    j+=1
            edges.append((i-j,i))
            move = abs(caracvertice(i-j,vertices)[1])+1
            if i==i_reader:
                move = -move
            vertices.append((i,depth,move))
        if element =='{':
            depth+=1
        if element =='}':
            depth-=1
    if i_reader==0:
        vertices[0] = (0,0,-1)
    return vertices,edges

def isvertice(j,vertices):
    for v in vertices:
        if v[0]==j: return True
    return False

def caracvertice(v,vertices):
    j=0
    while v != vertices[j][0]:
        j+=1
    return vertices[j][1],vertices[j][2]
            
def plottree(vertices,edges,shift,ax,x,size,factorx,factory,warning):
    listlabels=[(0,(0+0.05-shift)/factory,'0',0)]
    movemax = 0
    movei=0
    yi = 0
    ax.plot([-1.5,-1],[-1.5,-5],color='w')
    l = [(0,0)]
    l1 = [0]
    for v in range(max(vertices)[0]):
        l1.append(1)
    y = 0
    for e in edges:
        y = - caracvertice(e[1],vertices)[0]
        test = True
        while test:
            test2 = False
            for j in range(e[0]+1,e[1]+1):
                if isvertice(j,vertices):
                    move = abs(caracvertice(j,vertices)[1])
                    if (move,y) in l:
                        test2 = True
            if test2==True:
                y -= 1
            test = test2
        y1 = l1[e[0]]
        if(y>y1):
            y=y1
        move = caracvertice(e[1],vertices)[1]
        l.append((abs(move),y))
        l1[e[1]] = y
        c='k'
        if move<0:
            move=-move
            movei=move
            yi = y
            c='r'
        ax.plot([(move-1)/factorx,move/factorx],[(y1-shift)/factory,(y-shift)/factory],color='k',marker=None)
        ax.plot([move/factorx],[(y-shift)/factory],marker='o',markerfacecolor=c,color=c)
        listlabels.append((move/factorx,(y+0.05-shift)/factory,move,e[1]))
        if move>movemax:
            movemax=move
    if vertices[0][2] < 0:
        ax.plot([0],[-shift/factory],color='r',marker='o')
    else:
        ax.plot([0],[-shift/factory],color='k',marker='o')
    if x>movemax/factorx-size/2 and x!=-100:
        x = movemax/factorx-size/2
    if x<-1 and x!=-100:
        x = -1
    if x==-100 and movei/factorx>size-2:
        x=movei/factorx-1-size+2
    if x==-100 and movei/factorx<=size-2:
        x=-1
    ax.set_xlim(x+0.6,x+size+0.6)
    ax.set_ylim(yi-8,yi+2)
    for lab in listlabels:
        if lab[0]>x+0.6 and lab[1]<yi+2:
            ax.text(lab[0],lab[1],lab[2])
    if warning:
        ax.add_patch(pat.Rectangle((0.15,0.4),0.65,0.3,transform=ax.transAxes,edgecolor='r',linewidth=4,facecolor='w',zorder=4))
        ax.text(0.15,0.5,"          Press enter to confirm the suppression \n      of the current variation and all its subvariations.\n           Click or type any other key to cancel.",family='Arial',fontsize=14,zorder=5,transform=ax.transAxes)
        
    return x,listlabels
        
def showcom(variations,i_reader,ax,f,com):
    bbox = ax.get_window_extent().transformed(f.dpi_scale_trans.inverted())
    width = bbox.width
    split = int(width*8)
    ax.add_patch(pat.Rectangle((0,0.045),0.95,0.91,edgecolor='k',linewidth=4,facecolor='#fffaf5'))
    if com:
        ax.add_patch(pat.Rectangle((0.1,0.4),0.6,0.3,edgecolor='k',linewidth=4,facecolor='w',zorder=4))
        ax.text(0.2,0.5,"Enter your note in the editor\n Save and close the editor \n Double click to validate",family='Arial',fontsize=14,zorder=5)
    if variations[i_reader][0]!=-1:
        text = variations[i_reader][2]
    else:
        text = variations[i_reader][4]
    if len(text)<split:
        ax.text(0.1,0.2,text,transform=ax.transAxes,fontsize=13,family='fantasy')
    else:
        comment = ""
        dosplit=False
        for i in range(len(text)):
            comment+=text[i]
            if 1.*i/split==int(i/split) and i!=0:
                dosplit=True
            if text[i]==' ' and dosplit:
                comment=comment[:-1]+'\n'
                dosplit=False
        ax.text(0.1,0.2,comment,transform=ax.transAxes,fontsize=13,family='fantasy')
            
def showtoolbar(ax,sizewin):
    im = plt.imread('img/toolbar.png')
    oi = OffsetImage(im, zoom = 0.425*sizewin)
    box = AnnotationBbox(oi, (0.4,0.622), frameon=False)
    ax.add_artist(box)

def plothelp(ax):
    ax.add_patch(pat.Rectangle((0.,-1.4),10,12.4,edgecolor='k',linewidth=4,facecolor='w',zorder=4))
    ax.text(0.5,10.5,"About the game:",family='Arial',fontsize = 14,zorder=5)
    ax.text(3.,10.5,"http://aagenielsen.dk/hnefatafl_online.php",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,9.8,"Play a move:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,9.1," Click a piece to select it, then click an empty square to move it.\n The captured pawns are automatically removed.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,8.4,"Edit the position:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,6.9," Add pawns: right click after choosing white or black in the toolbar. \n Remove pawns: right click on the pawn you want to remove. \n Add/remove markers: select the marker/arrow tool, then right click. \n Add/remove arrows: select the marker/arrow tool, hold right click from one \n square to another to draw an arrow. Right click on the tail to delete.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,6.2,"Navigate in the variation tree:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,4.9," Press left/right on keyboard to play a move backward/forward. \n Press down on keyboard to switch between subvariations. \n Click on a point in the tree to go at any position. \n Scroll for defilement. Press +/- on keyboard to zoom/unzoom.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,4.2,"Add/delete variations:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,2.9," Variations are added automatically whenever a move is played before the \n end of the variation tree. \n To delete a variation and all its subvariations, go to the first move in the \n variation and press the button in the toolbar.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,2.3,"Edit a comment:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,1.6," Press the \"note\" button in the toolbar: this opens the current comment in \n a text editor. Edit the comment in the editor, then save, close, and confirm.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,0.9,"Open and save files:",family='Arial',fontsize = 14,zorder=5)
    ax.text(0.5,-0.3," Click the corresponding icons in the toolbar (or type shortcuts o and s).\n To open a game played on http://aagenielsen.dk, copy the sequence of \n moves as displayed in the game archive in a .txt file and open it in Fritjof.\n Games edited with Fritjof are then saved as .hntf files.",family='Arial',fontsize = 12,zorder=5)
    ax.text(0.5,-1.,"Report an issue:",family='Arial',fontsize = 14,zorder=5)
    ax.text(3.,-1.,"456ytreza456@gmail.com",family='Arial',fontsize = 12,zorder=5)
    ax.text(7.1,-1.3,"Press any key to close help",family='Arial',fontsize = 10,zorder=5)
    
def drawwindow(f,ax,sizewin,board,variations,selection,arrows,i_reader,x,size,factor,com,warning,showhelp):
    (ax1,ax2,ax3,ax4,ax5) = ax
    (vertices,edges) = buildtree(removecom(variations),i_reader)
    shift = 3
    factorx = factor
    factory = factor/2
    x,listlabels = plottree(vertices,edges,shift,ax2,x,size,factorx,factory,warning)
    drawboard(board,selection,arrows,ax1,sizewin)
    showtoolbar(ax4,sizewin)
    showcom(variations,i_reader,ax3,f,com)
    showhelpbutton(ax5)
    if showhelp:
        plothelp(ax1)
    return x,listlabels
    